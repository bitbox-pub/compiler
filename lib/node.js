import dom 			from './dom'
import __source__ 	from './source'

import importNode 	from './nodes/import'
import exportNode 	from './nodes/export'
import scriptNode 	from './nodes/script'
import styleNode 	from './nodes/style'
import modNode 		from './nodes/mod'

let scope = 'box'
let index = []
let boxname = ''
const LINE_COMMENT = /^\s*\/\/.*$/gm;
const JS_COMMENT = /\/\*[^\x00]*?\*\//gm;
let meta = { }

let nodes = {
	clearMeta: () => {
		meta = { import: {}, export: {}, local: {} }
	},
	mustreturn: false,
	lastNode: null,
	methods: [],
	pairs: {},
	routes: [],
	init: [],
	inlineThunks: [],
	body: '',
	observableKeys: [],
	delegateKeys: [],
	box: [],
	imports: [],
	exports: [],
	boxes: [],
	keys: {},
	bits: [],

	import: (node) => importNode(node, meta.import),
	export: exportNode,
	script: scriptNode,
	//mod: modNode,
	style: styleNode,

	styles: [],
	inits: [],
	convertprops,
	objectToArray(obj) {
	    return Object.keys(obj).map(function toItem(k) {
	        return obj[k];
	    });
	},


	selfClosing(node) {
		node.content = -1
		return this.tag(node)
	},

	text: (text) => `$tree.push(${ text });`,

	tag(node) {

		//console.log('tag-node: ' + node.name, node.body)
		this.lastNode = node
		let isnative = dom[node.name] === node.name ? true : false
		let mustreturn = false
		let outerexpr = ''
		let innerexpr = ''
		let innerexprclose = ''
		let outerexprclose = ''
		let isInlineThunk = false

		if (!node.object)
			node.object = {}

		node.object.attributes = [...node.attrs]
		if (node.attrs.length) {
			for(let ei in node.attrs) {
				let prop = node.attrs[ei]
				if (prop) {
					if (prop.rel && prop.rel === 'def') {

						node.jsname = toCamel(node.name)

						node.type = 'box'
						this.boxes.push(node)

						let args = prop.value.trim()
						args = args ? `${ args.substr(0, args.length - 1) })` : null
						node.args = args
						let newbox = [``,``]
						if (node.parent === 'root' || node.parent.name === 'mod') {
							//newbox = [`box.set(`, `)`]
						} else {
							newbox = [`${node.parent.name}.${ toCamel(node.name) } = `, ``]
							//newbox = [``, ``]
						}

						let _export = ``;
						let _boxset = ``;
						if (node.parent === 'root' || node.parent.name === 'mod') {
							//__source__(node);
							if (node.props.set || node.props.box) {
								_boxset = `\nbox(${toCamel(node.name)});`
								delete node.props.set
								delete node.props.box
							}
							if (node.props.export) {
								//_export = `\nbox.set(${ toCamel(node.name) }, __moduleName);\nexport `
								_export = `\nexport `
								//_boxset = `\nbox.set('${toCamel(node.name)}', ${toCamel(node.name)});`
								delete node.props.export
							} else {
								///_export = `\nbox.set(${ toCamel(node.name) }, __moduleName);\n`
							}
						}
						// const $tree = []
						// $tree.push = function(e) { return this[this.length] = e }
						// function commit(...args) { return ${node.jsname}$box.commit(...args) }
						//${ toCamel(node.name) }.view = view

						const bits = this.bits.filter((value, index, self) => self.indexOf(value) === index).map(b => {
							return `${ toCamel(node.name) }.bit.${b};`
						}).join('\n') + '\n'
						this.bits = []

						outerexpr += `
						/** ${node.name}!box */
						box.define(${ toCamel(node.name) }, __moduleName);
						${bits}${_export}${newbox[0]} function ${ toCamel(node.name) }${ args } {`

							if (node.parent === 'root') {

								const loads = Object.keys(meta.local).map(load => `new bitbox(${node.jsname}$box, ${load})`)
								//const ${node.jsname}$box = arguments[0]
								outerexpr += ``
								outerexpr += `${ this.inits.join('\n')}\n`
								outerexpr += `${ loads.join('\n')}\n`
								this.keys = {}
								this.inits = []
								outerexpr = outerexpr.replace(/this\$box/g, `${node.jsname}$box`)
								node.content = node.content.replace(/this\$box/g, `${node.jsname}$box`)
							}

						outerexprclose = outerexprclose + `}${newbox[1]}${_boxset}`
						delete node.props[prop.key]
					}

					switch(prop.key) {
						case 'from':
							//if (!meta.localimport)
							//	meta.localimport = {}
							node.props.from = `'${node.props.from.replace(/['"`]/g, '')}/${node.name}!box'`
							meta.import[toCamel(node.name)] = node.props.from //.replace(/['"`]/g, '')
							this.imports.push(`import { ${toCamel(node.name)} } from ${node.props.from}`)
							delete node.props.from
						break;
						case 'text':
							if (prop.value)
								node.content = `\`${node.content}\``
						break;
						case 'if':
							outerexpr += `if ${ prop.value } {`
							outerexprclose = `}`
							delete node.props.if
						break;
						case 'for':
							if (prop.rel === 'invoke') {
								innerexpr += `for ${ prop.value } {`
								innerexprclose = `}`
								delete node.props.for
							}
						break;
						case 'switch':
							innerexpr += `switch ${ prop.value } {`
							innerexprclose = `}`
						break;
						case 'each':
							if (prop.obj) {
								innerexpr += `${ prop.obj }forEach(${ prop.value } => {`
								innerexprclose = `})`
							} else {
								const parts = prop.value.replace('(', '').replace(')', '').split(',')
								const ctx = parts.shift().trim()
								const arg = parts.join(',')
								innerexpr += `box.each(${ ctx }, (${arg}) => {`
								innerexprclose = `})`
							}
						break;
						case 'map':
							innerexpr += `${ prop.obj||'box.' }map( ${ prop.value } => {`
							innerexprclose = `})`
						break;
					}

					if (prop.key.endsWith('.map')) {
						innerexpr += `${ prop.key }(${ prop.value } => {`
						innerexprclose = `})`
						delete node.props[prop.key]
					}
					if (prop.key.endsWith('.each')) {
						innerexpr += `${ prop.key.replace('.each','.forEach') }(${ prop.value } => {`
						innerexprclose = `})`
						delete node.props[prop.key]
					}

					if (prop.rel === 'invoke') {
						node.invoke = `${ node.name }.${ prop.key }${ prop.value }`
						delete node.props[prop.key]
					}

				}
			}
		}

		if (node.props.style) {
			node.props.style = normalizeStyle(node.props.style)
		}

		if (node.return) {
			let n = `${ node.content }`
			if (node.content.trim().indexOf('...') === 0)
				n = `${ node.content }`
			node.content = n.indexOf('$tree') === 0 ? n : `$tree.push(${ n });`
		}

		if (node.props.case) {
			let caseex = `case ${ node.props.case }:`
			node.props.key = `'case-${ node.props.case.replace(/['"`]/g, '') }'`
			if (node.props.case === true) {
				let keys = Object.keys(node.props)
				let caseval = keys[keys.indexOf('case') + 1]
				node.props.key = caseval
				delete node.props[caseval]
				if (caseval === 'default')
					caseex = `default:`
				else
					caseex = `case '${ caseval }':`
			}
			outerexpr = `${ caseex }`
			outerexprclose = `break;`
			delete node.props.case
		}

		let attrs = node.props ? `${ convertprops(node.props) }` : ``

		let bodyornode = ''
		let bodyornodeend = ''
		let name = node.name

		if (node.type !== 'box') {

			if (node.name === 'mod') {

				bodyornode = ``
				bodyornodeend = ``

			} else {

				name = `${ toCamel(node.name) }`

				if (node.content === -1) {
					node.content = ''

					if (node.invoke_zz) {
					} else {
						if (meta.local[name+'__s']) {
						} else {

							let __bind = node.props.bind || node.props.bit || 'this'
							let key = name

							if (node.key) {
								__bind = `${__bind}.${node.key}`
								this.bits.push(`${node.key} = ${name}`)
							}

							delete node.props.bind
							delete node.props.bit

							let p = { ...node.props }
							attrs = p ? `${ convertprops(p) }` : ``
							const a = attrs ? `, { ${ attrs } }` : `, {}`

							node.object.key = key
							node.object.props = `{${ attrs }}`

							const bxname = node.comprop || node.dotprop || name
							bodyornode = `$tree.push(${bxname}.call(${__bind}${a}));`
						}
					}
					bodyornodeend = ``
				} else {
					//name.indexOf('.') > -1 ||
					if (meta.local[name+'__s']) {} else {

						let __bind = node.props.bind || node.props.bit || 'this'
						let key = name
						if (node.key) {
							__bind = `${__bind}.${node.key}`
							this.bits.push(`${node.key} = ${name}`)
						}

						delete node.props.bind
						delete node.props.bit

						let p = { ...node.props }

						attrs = p ? `${ convertprops(p) }` : ``

						const a = attrs ? `, { ${ attrs } }` : `, {}`
						const bxname = node.comprop || node.dotprop || name

						bodyornode = `$tree.push(${bxname}.call(${__bind}${a}, ($tree => {`
						bodyornodeend = `return $tree })([])));`
					}
				}
			}
		} else {

			if (node.returning) {
				bodyornode = `/** returning **/\n`
				bodyornodeend = ``
			} else {

					let p = {
						...node.parent.props,
						...node.props
					}
					delete p['export']
					delete p['default']
					delete p[node.parent.name]
					attrs = p ? `, {${ convertprops(p)} }` : ``
					name = `'${ node.name }'`
					const nargs = node.args.replace('(', '').replace(')', '').split(',')

					const en = node.props.register
						? typeof node.props.register === 'string' && node.props.register.indexOf('-') > -1
							? node.props.register
							: `'${node.name}-box'`
						: `'${node.name}'`

					bodyornode = `return new box(${en}${attrs}, ($tree => {`
					bodyornodeend = `return $tree })([]))`

					__source__({
						js: `${outerexpr}${bodyornode}${innerexpr}${node.content}${innerexprclose}${bodyornodeend}${outerexprclose}`.trim(),
						source: `${node.tag}${node.body}</${node.name}>`,
						name: `${node.name}`
					})

				//}
			}
		}

		index[node.i] = typeof index[node.i] !== 'undefined' ? index[node.i] + 1 : 1

		//let keyvars = getProps(node.props, 'var')
		let args = `` //keyvars.length ? `let { ${ keyvars.join(`, `) } } = props;` : ``
		let isbody = false

		let ret = `
			${ outerexpr }
			${ bodyornode }${ args }${ innerexpr }${ node.content }${ innerexprclose }
			${ bodyornodeend }
			${ outerexprclose }`

		return ret.trim().replace(/\n\n/g, '\n')
	},

	isString(str) {
		let strreg = /['"`]([^'`"]+)["'`]/g
		return strreg.exec(str.trim())
	}

}

export default nodes;


function normalizeStyle(subject) {

	let pxkeys = ['width', 'height', 'left', 'top', 'right', 'bottom', 'padding-', 'margin-', 'font-size', 'border-radius']

	let result = subject.replace(/(\w+[-]?\w+)\s?[:]\s?([^,\[\{\}]+)?(\[([^\]]+)\])?/g, (_, key, value="", __, pos="") => {

		key = key.trim()
		if (value)
			value = value.trim()

		let sub = key.split('-')[0] + '-';
		let ispx = pxkeys.indexOf(sub)
		if (ispx < 0) ispx = pxkeys.indexOf(key)

		if (ispx > -1 && value[0] !== `"` && value[0] !== `'`)
			if (!value.length && pos.length) {
				value = pos.trim()
				value = value.split(',')
				value = value.map(x => {
					x = x.trim()
					if (x.endsWith('%'))
						return `(${ x.substr(0, x.length-1) }) + "% "`
					else
						return parseInt(x) >= 0 ? `(${ x }) + "px "` : `${ x }`
				}).join(' + ')
			} else if (value.endsWith('%')) {
				value = `(${ value.substr(0, value.length-1) }) + "%"`
			} else {
				value = parseInt(value) >= 0 ? `(${ value }) + "px"` : `${ value }`
			}
		else if (value.length && pos.length) value = value + __
		key = toCamel(key)
		if (parseInt(value) >= 0) value = `'${ value }'`
		//console.log('res > ', { key, value }, parseInt(value))
		return `${ key }: ${ value }`
	})
	//console.log('normalizeStyle >> result', result, '\n\n')
	return result

}

// function getProps(props, e = 'key') {
// 	let x = Object.keys(props).map(key => {
// 		if (key.indexOf('-') > -1 ) {
// 			let nk = toCamel(key)
// 			if (key.indexOf('on-') === 0) key = key.replace('on-', 'ev-')
// 			return `${ nk } = props["${ key }"]`
// 		}
// 		return `${ toCamel(key) } = ${ props[key] }`
// 	})
// 	return x
// }

function convertprops(p, a = ': ', b = ', ') {
	let props = { ...p }
	let keys = Object.keys(props)
	let result = []
	let events = []

	let rest = []

	keys.forEach(key => {

		let value = props[key]

		if (key.indexOf('on-') === 0) {
			events.push(`${ key.replace('on-', '') }${ a }${ value === key ? toCamel(value) : value }`)
			delete props[key]
		} else if (key === 'on') {
			const v = value.substr(1, value.length - 2)
			if (v) {
				events.push(`${ v }`)
				delete props[key]
			} else {
				result.push(`on`)
			}

		} else if (key === 'class') {
			if (value.indexOf('[') === 0) {
				const parts = value.substr(1, value.length - 2).split(',')
				value = '{ ' + parts.map(p => p + ': true').join(', ') + ' }'
			}

			result.push(`${ key }${ a }${ value }`)
		} else if (key === 'style') {
			result.push(`${ key }${ a }${ value }`)
		} else if (key.indexOf('...') === 0) {
			result.push(`${ toCamel(key) }`)
		} else {
			result.push(`${ toCamel(key) }${ a }${ value }`)
		}
	})

	if (events.length)
		result.push(`on${ a } { ${ events.join(b) } }`)

	return result.join(b)

}

function toCamel(subj, all) {
	if (subj && subj.indexOf('-') > -1) {
		var parts = subj.split('-');
		subj = parts.map(function(p, i) { return !all && i === 0 ? p : p.substr( 0, 1 ).toUpperCase() + p.substr( 1 )}).join('')
	}
	return !all ? subj : subj.substr( 0, 1 ).toUpperCase() + subj.substr( 1 )
}

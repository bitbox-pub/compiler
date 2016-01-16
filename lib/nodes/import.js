import { camelCase } from '../helpers'

export default function(node, meta) {

	if (node.attrs.length === 1
		&& node.attrs[0].key === 'import'
		&& node.attrs[0].type === 'static') {
			return `import '${ node.attrs[0].value }';\n`
		}

	let keys = Object.keys(node.props)

	//if (keys[0].indexOf('-') > -1) keys[0] = `{ ${ camelCase(keys[0]) } }`

	let name = camelCase(keys[0])

	let exp = node.attrs.map(prop => {
		if (prop.type === 'value')
			return `{ ${ prop.value } as ${ camelCase(prop.key) } }`
		else
			return `${ camelCase(prop.key) }`
	})
	const src = node.props.from ? node.props.from : exp[0]
	meta[name] = src //.replace(/['"`]/g, '')
	if (src.indexOf('!box') > -1)
	//	return `` // `// import ${ name } | $.import('${ name }')\n`
		return `import { ${name} } from ${ node.props.from ? src : `from '${ src }'` };\n`
	else
		return `import ${ exp.join(` `) } ${ node.props.from ? src : `from '${ src }'` };\n`
	//return `import ${ exp.join(` `) } ${ node.props.from ? src : `from '${ src }'` };\n`

}

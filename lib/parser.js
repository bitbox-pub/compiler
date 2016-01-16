import observe      from './event'
import transform    from './node'
import beautify     from 'js-beautify'

function Printer(parent) {
    this.parent = parent;
    this.content = '';
    this.spacer = '';
    this.indent = parent ? parent.indent : '';
    this.isFirstItem = true;
}

Printer.prototype.addSpace = function (space) {
    this.spacer += space;
    if (space.indexOf("\n") !== -1) {
        this.indent = /[^\n]*$/.exec(space)[0];
    } else {
        this.indent += space;
    }
}

Printer.prototype.add = function (data, ignoreComma) {
    this.content += this.spacer;
    this.spacer = '';
    this.content += data;
}


export default class Parser {

	constructor(options = {}) {
		observe(this)

		this.token = {}
		this.chars = []
		this.index = []
		this.attrs = []
		this.props = {}
		this.nodes = []
		this.text = []
		this.tree = {}
		this.result = ''
        this.node = {}

		this.token = { '<': 1, '</': 1 }


        var elements = []
        var printer = new Printer(null)

        //this.on('run', () => {

            printer = new Printer(null)

    		let i = 0
            let isnode = false

        //})

		this.on('open', (name, node) => {
			i++
            if (name === '___bitbox')
                node.component = { key: node.attrs[0].key, attr: node.attrs }
            else
                node.component = node.parent.component

            if (node.tag && node.tag.endsWith('=>')) {
                node.return = true
            }

			elements.unshift([ name, node.attrs ])
			printer = new Printer(printer)
            isnode = true
		})

		this.on('text', (text) => {

			var lines = text.split("\n");
			var isFirst = true;
			lines.forEach((line) => {

            	var lineMatch = /^(\s*)(.*?)(\s*)$/.exec(line);
            	var preSpace = lineMatch[1],
                    mainText = lineMatch[2],
                    postSpace = lineMatch[3];

                if (!isFirst) printer.addSpace("\n")

				if (mainText.length > 0) {
                    let fc =  mainText[0]
                    if (isnode === true && (
                        (fc === '`' || fc === "'" || fc === '"') )) {
							printer.add(mainText)
                    } else {
						printer.add(mainText)
					}
				}
				isFirst = false;
			});

		})

		this.on('close', (name, node) => {
            isnode = false
			var element = elements.shift()
			var content = printer.content
			printer = printer.parent
			node.content = content

			if (typeof transform[name] === 'function')
				printer.add(transform[name](node))
			else
				printer.add(transform.tag(node))
			i--
			//if (i === 0) this.emit('done')
		})

		this.on('self-closing', (name, node) => {
			if (typeof transform[name] === 'function')
				printer.add(transform[name](node))
			else
				printer.add(transform.selfClosing(node))
			//if (i === 0) this.emit('done')
		})

		this.on('done', () => {
            //console.log('parser-done', printer.content);
            //printer.content = printer.content.replace(/^\s*\n/gm, '\n')
            this.compiled = printer.content
			this.write(this.compiled)
            printer = new Printer(null)
		})

		this.extract()

	}

    balanced(result = {}, pairs = []) {

        let s = result.out ? result.out : result.input

    	let c = 0, _o = [], _c = [], _x = [], st = '<', canclose = -1, openat = 0, sp = [],
            sub = s, pair = false, openpos = 0, closepos = 0, subs = '',
            isopen = false, eqpos = 0, element = {},
            keys = [], key;

        let open = pairs.map(p => p.charAt(0))
        let close = pairs.map(p => p.charAt(1))
        let openMatch = null
        let closeMatch = null
        let currentOpen = false

        let subcopy = s;
        let values = []

        result.pairs = {}
        result.error = false
        result.return = false
        //result.attr = result.attr ? result.attr : {}
        result.out = ''
        result.props = result.props ? result.props : []

        let tagreg = /^<([^\(\s\=\/\>]+)/
        let tagmatch = tagreg.exec(s)
        if (tagmatch) {
            //console.log('tagmatch', tagmatch)
            const name = tagmatch[1].split(':')
            result.name = name[0]
            if (result.name.indexOf('[') > -1) {
                const rn = result.name.replace(/\[/g, '.').replace(/\]/g, '.')
                subcopy = s = s.replace(result.name, rn)
                result.comprop = `${result.name}`
                result.name = rn
            }
            if (result.name.indexOf('.') > -1) {
                //result.name = result.name.split('.')[0]
                result.dotprop = `${result.name}`
            }
            result.key = name[1] || null
        }

    	for (var i = 0; i < s.length; i++) {
    		var ch = s.charAt(i);

            result.pos = i

            if (ch === st && s.charAt(i+1) !== '/' && canclose === -1) {
                canclose = i;
                openat = i;
                //let s1 = s.substr(i+1).split(' ').shift()
                //result.name = s1.replace('=','').replace('>','')
            }

            if (canclose > -1) {

                if (!currentOpen) {
                    let oi = open.indexOf(ch)
                    if (oi > -1) {
                        openMatch = ch
                        closeMatch = close[oi]
                    }
                }

                if (ch === openMatch) {

                    currentOpen = openMatch
                    c++;
                    _o.push(i);

                    if (!isopen) {
                        let s1 = s.substring(0, i)
                        let tst = s1.replace(/\s+/g, ' ').split(' ')
                        let pk = tst.pop()
                        key = pk.length ? pk : tst.pop() + ' '
                        //console.log('OPEN', result.name, key, openMatch)
                        keys.unshift(key)
                    }

                    isopen = true

                } else if (ch === closeMatch) {

                    c--;
                    _c.push(i);

                    if (c === 0) {
                        let key = keys.shift();
                        let rel = key.endsWith('=') ? 'assign' : 'invoke'

                        if (key.indexOf('<') === 0) {
                            result.box = true
                            key = key.substr(1)
                            rel = 'def'
                        }
                        let type = openMatch + closeMatch

                        currentOpen = false
                        openMatch = null
                        closeMatch = null

                        isopen = false
                        openpos = _o.shift()
                        closepos = _c.pop()
                        let value = s.substring(openpos, closepos + 1)
                        //console.log('CLOSE'.bgRed, result.name.bgGreen, key.bgBlue, value.bgGreen)

                        result.__i = result.props.push({
                            key: key.trim().replace('=', ''),
                            value, type, rel
                        })

                        subcopy = subcopy.replace(key+value, result.__i)
                        //console.log('CLOSE', result.name, key, type, value)
                        //console.log('SUBCOPY', subcopy)
                        _o = [];
                        _c = [];

                    } else {
                        //openpos = _o.shift()
                        //closepos = _c.pop()
                        //console.log('ERROR', key)
                        //console.log('RESULT', result)
                        // result.error = {
                        //     type: 'unbalanced',
                        //     input: s.substring(openpos, closepos + 1)
                        // }
                        // return result
                    }
        			if (c < 0) {
                        result.error = 'c < 0'
                        return result;
                    }
        		}
                if (ch === '>') {
                    if (c === 0) {
                        if (s[i-1] === '=')
                            result.return = true

                        if (s[i-1] === '/')
                            result.selfClosing = true

                        let tag = s.substring(canclose, i + 1)
                        result.tag = tag
                        //console.log(result.name.bgRed + tag.bgYellow)

                        subcopy = subcopy.substring(openat + 1, i)
                        //console.log('subcopy>>>>>>>>', subcopy)

                        subcopy = subcopy.split('>').shift().trim()
                        if (result.return || result.selfClosing)
                            subcopy = subcopy.substring(0, subcopy.length-1).trim()

                        canclose = 0
                        result.out = subcopy.replace(/\s+/g, ' ').trim()
                        return result
                    } else {
                        //console.log('\nIGNORE '.red, s.substring(openat, i).bgYellow + '>'.bgRed)
                    }
                }
            }
    	}
    	if (c === 0) return result
        result.error = 'c !== 0'
        return result
    }

	extract() {
		let i = 0, node = null, roots = 0, frompos = 0

		this.on('<', (pos, tok) => {

			let str = this.string(pos)
            if (str.indexOf('</') === 0) return

			let innerpos = pos + tok.length
			let innerstr = str.slice(innerpos)
            let props = {}

            let a = str

            let b = null

            if (a.length) {

                b = this.balanced({ input: a, __i: 0 }, ['()', '{}', '[]'])

                b.out = b.out.replace(/([\w\-]+)\s?=?\s?['"`]([^'`"]+)["'`]/g, (match, key, value) => {
                    let type = 'static'
                    if (key === 'class') {
                        value = '{' + value.split(' ').map(c => `'${ c }': true`).join(', ') + '}'
                        type = '{}'
                    }
                    b.__i = b.props.push({ key, value, type, rel: 'assign' })
                    return b.__i
                })

                frompos = pos + b.pos
                if (b.out.startsWith(b.name)) b.out = b.out.substr(b.name.length)

                b.out = b.out.trim()
                let c = b.out.split(' ').map(i => {
                    let index = parseInt(i)
                    if (index) {
                        return b.props[index - 1]
                    } else if (i.length) {
                        let reg = /[^A-Za-z0-9-]/
                        let v = i.split('=')
                        if (v.length === 2) {
                            return { key: v[0], value: v[1], type: 'value' }
                        }
                        if (i.indexOf('...') === 0)
                            return { key: i, type: 'spread' }
                        if (i.startsWith('+') || i.startsWith('-'))
                            return { key: i.substr(1), value: i[0] === '+' ? 1 : 0, type: '10' }
                        return { key: i, value: i, type: 'keyed' }
                    } else {
                        return null
                    }
                })
                b.props = c;
            }

				if (b && b.name && !b.error) {

                    let tag = b.tag || ''
                    let name = b.name
                    let key = b.key
                    let attrs = b.props
                    let props = {}

                    attrs.forEach((attr, i) => {
                        if (attr)
                            if (attr.key === ':' + key)
                                delete b.props[i]
                            else
                                props[attr.key] = attr.type === 'static' ? `'${ attr.value }'` : attr.value
                    })

                    let parent = this.index[this.index.length - 1] ? this.index[this.index.length - 1] : 'root'
					node = { i, tag, name, key, attrs, props, parent, start: { pos, tok } }
                    node.type = b.selfClosing ? 'self-closing' : 'normal'
                    node.box  = b.box
                    node.name = node.name ? node.name.match(/([a-z-0-9]+)/)[1] : node.name
                    node.camelName = this.toCamel(node.name)
                    node.comprop = b.comprop
                    node.dotprop = b.dotprop

                    //console.log('node', node)

                    if (this.text.length) {
                        let text = this.text.pop()
                        if (text) this.emit('text', this.string(text, pos))
                    }

                    this.node = node

                    if (b.selfClosing) {
                        node.body = null
                        this.emit('self-closing', name, node)
                        this.emit('node', node)
                    } else {
                        this.index.push(node)
    					this.emit('open', name, node)
    					this.text.push(pos + tag.length)
                    }

					i++
				}

		})

		this.on('</', (pos, tok) => {

			let start = this.index.pop()

			if (start) {
				let close = this.string(pos, pos + tok.length + start.name.length + 1)
				if (close === `</${start.name}>`) {
					i--
					node = start
				} else {
					node = null
					this.index.push(start)
				}
			}

			if (node) {
				node.body = this.string(node.start.pos + node.tag.length, pos)

                if (node.box) {
                    //node.returning = 1
                    let retreg = /(.+return([^<\/>]+)<\/>)/gm
                    let isret = retreg.exec(node.body+'</>');
                    if (isret) {
                        node.returning = isret[2].trim()
                    }
                }

				node.end = { pos, tok }
				node.type = 'normal'
				if (this.text.length) {
					let text = this.text.pop()
					if (text) this.emit('text', this.string(text, pos))
				}
				this.text.push(pos + tok.length + node.name.length + 1)
				this.emit('close', node.name, node)
				this.emit('node', node)
			}

		})

	}

    toCamel(subj, all) {
    	if (subj && subj.indexOf('-') > -1) {
    		var parts = subj.split('-');
    		subj = parts.map(function(p, i) { return !all && i === 0 ? p : p.substr( 0, 1 ).toUpperCase() + p.substr( 1 )}).join('')
    	}
    	return !all ? subj : subj.substr( 0, 1 ).toUpperCase() + subj.substr( 1 )
    }

    exprattr(str) {
    	str = str.replace(/\n/g, ' ').replace(/\t/g, '').trim()
    	let re = /((\w+\.)+)?(\w+)\s?(\([^)]+\))/gi; ///(\w+)\s?(\([^)]+\))([\s\/\>])/gi;
        let exprs = []
    	let result = str.replace(re, (m, obj, iobj, type, expr, s) => {
            exprs.push({ type, expr, obj })
            return ''
        });
        return { result, exprs }
    }

	string(a, b) {
		if (typeof a === 'string') {
			this._string = a //.replace(/\n/g, ' ').replace(/\t/g, '').trim()
			this.result = this._string
			return this._string
		}
		return this._string.slice(a, b)
	}

	update(payload, value) {
		let diff = {}

		if (value && typeof payload === 'string') {
			let key = payload;
			payload = {};
			payload[key] = value;
		}
		if (payload && typeof payload === 'object') {
			Object.keys(payload).map(k => {
				if (this[k] !== payload[k]) {
					diff[k] = {
						old: this[k],
						new: payload[k]
					}
					this[k] = payload[k]
				}
			});
		}

		this.emit('update', payload, diff)

	}

	run() {

		this.chars = []
		this.index = []
		this.attrs = []
		this.props = {}
		this.nodes = []
		this.text = []
		this.tree = {}
		this.result = ''
        this.compiled = ''

		this.emit('run', this.token)

		let string = this.string(0)

		for (let char of string) {
			let index = this.chars.push(char) - 2

            if (char !== '"' && char !== '`' && char !== `'`) {
    			Object.keys(this.token).forEach((token) => {

    				let s = this.string(index).startsWith(token)

    				if (s === true) {
    					this.emit(token, index, token)
                    }
    			})
            }

		}
        this.emit('done')
        return this.compiled
	}

	fromString(content, fn) {
		this.fn = fn
		this.source = content
		//let a = content //.replace(/\s+/g, ' ') //.trim()
		//let eqreg = /(\s+)?(\=)(\s+)?/g
		//a = a.replace(eqreg, '=')
		this.string(content)
		this.emit('ready')
		return this.run()

	}

    parse(content, fn) {
        transform.clearMeta()
        transform.boxes = []
        this.fn = fn
        //let eqreg = /(\s+)?(\=)(\s+)?/g
        //content = content.replace(eqreg, '=')
        this.source = content
        this.string(content)
        this.emit('ready')
        this.run()
        //this.compiled = this.compiled.replace(/^\s*[\r\n]/gm, '')
        if (typeof fn === 'function')
            return fn.call(null, this.source, this.compiled)
        return beautify(this.compiled, {
			indent_with_tabs: true,
			indent_size: 4
		})
        //return this.compiled
    }

    transform(code) {
        return {
            code: this.parse('<mod>' + code + '</mod>'),
            node: this.node
        }
    }

	write(content) {
		if (typeof this.fn === 'function')
			this.fn.call(null, this.source, content)
	}

}

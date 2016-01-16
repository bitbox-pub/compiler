let __source = {}

export function get(name) {
	return __source[name]
}

export default function(n) {
	//n.source = n.source.replace(/\=\>/g, ' =>')
	n.source = n.source.replace(/<([a-z0-9-]+)(.*)=>(.*)<\/([a-z0-9-]+)>$/gm, "<$1$2=>$3")
	__source[n.name] = n
    console.info('source:', n.name);
}

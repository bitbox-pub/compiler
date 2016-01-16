import { camelCase } from '../helpers'

export default function(node) {

	console.log('node:export', node)

	let exp = node.attrs.map(prop => {
		if (prop.type === 'value')
			return `{ ${ prop.value } as ${ camelCase(prop.key) } }`
		else
			return `${ camelCase(prop.key) }`
	})

	return `export ${ exp.join(` `) };\n`

}

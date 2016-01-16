import parser from './parser'

export default function compile(source, options) {
    /** hacks */
    source = source.replace(/(\()(<([a-z0-9-]+)(.*)=>([^\n</]+))(\))$/gm, "(<$3$4=>$5</$3>)")
    source = source.replace(/<([a-z0-9-]+)(.*)=>([^\n</]+)$/gm, "<$1$2=>$3</$1>")
    let result = new parser().transform(source, options)

    result.code = result.code.replace(/exportfunction/g, 'export function')
    result.code = result.code.replace(/\;\)/g, '\)')

    if (result.code.indexOf('$tree.push') === 0)
        result.code = result.code.substr(11, result.code.length - 13)

    return result.code;

}

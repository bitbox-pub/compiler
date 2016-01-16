export function camelCase(subj, all) {
	if (subj.indexOf('-') > -1) {
		var parts = subj.split('-');
		subj = parts.map((p, i) => !all && i === 0 ? p : p.substr( 0, 1 ).toUpperCase() + p.substr( 1 ) ).join('')
	}
	return !all ? subj : subj.substr( 0, 1 ).toUpperCase() + subj.substr( 1 )
}

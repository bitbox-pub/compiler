function isFunction(v) { return typeof v === 'function' || false }

export default function event(el) {

	el = el || {}

	var callbacks = {},
		_id = 0;

    el.events = {}
    el.getEvents = function() {
        return Object.keys(callbacks)
    }

    el.update = function(payload, value) {
		let diff = {}
		if (value && typeof payload === 'string') {
			let key = payload;
			payload = {};
			payload[key] = value;
		}
		if (payload && typeof payload === 'object') {
			Object.keys(payload).map(k => {
				if (el[k] !== payload[k]) {
					diff[k] = {
						old: el[k],
						new: payload[k]
					}
					el[k] = payload[k]
				}
			});
		}
		el.emit('update', payload, diff)
	}

    el.sub = function(events, fn) {
		if (isFunction(fn)) {
			fn._id = typeof fn._id == 'undefined' ? _id++ : fn._id
			events.replace(/\S+/g, function(name, pos) {
				(callbacks[name] = callbacks[name] || []).push(fn)
				fn.typed = pos > 0
			})
		}
		return el
	}

	el.on = function(events = [], fn) {
		if (isFunction(fn)) {
			fn._id = typeof fn._id == 'undefined' ? _id++ : fn._id

            if (!Array.isArray(events)) events = [events]
            events.map(function(name) {

                if (name !== 'listener' && name !== 'update') {
                    el.events[name] = true;
                    el.emit('listener', name)
                }

                (callbacks[name] = callbacks[name] || []).push(fn)
				//fn.typed = pos > 0
			})
		}
		return el
	}

	el.off = function(events, fn) {
		if (events == '*') {
            callbacks = {}
        } else {
            if (!Array.isArray(events)) events = [events]
			events.map(function(name) {
				if (fn) {
					var arr = callbacks[name]
					for (var i = 0, cb;
						(cb = arr && arr[i]); ++i) {
						if (cb._id == fn._id) {
							arr.splice(i, 1);
							i--
						}
					}
				} else {
					callbacks[name] = []
				}
			})
		}
		return el
	}

	el.one = function(name, fn) {
		function on() {
			el.off(name, on)
			fn.apply(el, arguments)
		}
		return el.on(name, on)
	}


    el.pub = function(name) {

		var args = [].slice.call(arguments, 1),
			fns = callbacks[name] || []

		for (var i = 0, fn;
			(fn = fns[i]); ++i) {
			if (!fn.busy) {
				fn.busy = 1
				fn.apply(el, fn.typed ? [name].concat(args) : args)
				if (fns[i] !== fn) {
					i--
				}
				fn.busy = 0
			}
		}

		if (callbacks.all && name != '*') {
			el.trigger.apply(el, ['*', name].concat(args))
		}

		return el
	}


    el.emit = function(name) {
		var args = [].slice.call(arguments, 1),
			fns = callbacks[name] || []

		for (var i = 0, fn;
			(fn = fns[i]); ++i) {
			if (!fn.busy) {
				fn.busy = 1
				fn.apply(el, fn.typed ? [name].concat(args) : args)
				if (fns[i] !== fn) {
					i--
				}
				fn.busy = 0
			}
		}

		if (callbacks.all && name != '*') {
			el.trigger.apply(el, ['*', name].concat(args))
		}

		return el
	}

	el.trigger = function(name) {
		var args = [].slice.call(arguments, 1),
			fns = callbacks[name] || []

		for (var i = 0, fn;
			(fn = fns[i]); ++i) {
			if (!fn.busy) {
				fn.busy = 1
				fn.apply(el, fn.typed ? [name].concat(args) : args)
				if (fns[i] !== fn) {
					i--
				}
				fn.busy = 0
			}
		}

		if (callbacks.all && name != '*') {
			el.trigger.apply(el, ['*', name].concat(args))
		}

		return el
	}

	return el

}

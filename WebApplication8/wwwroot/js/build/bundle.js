(function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {string} style_sheet_id
	 * @param {string} styles
	 * @returns {void}
	 */
	function append_styles(target, style_sheet_id, styles) {
		const append_styles_to = get_root_for_style(target);
		if (!append_styles_to.getElementById(style_sheet_id)) {
			const style = element('style');
			style.id = style_sheet_id;
			style.textContent = styles;
			append_stylesheet(append_styles_to, style);
		}
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @template {keyof SVGElementTagNameMap} K
	 * @param {K} name
	 * @returns {SVGElement}
	 */
	function svg_element(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {{}}
	 */
	function get_custom_elements_slots(element) {
		const result = {};
		element.childNodes.forEach(
			/** @param {Element} node */ (node) => {
				result[node.slot || 'default'] = true;
			}
		);
		return result;
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	let SvelteElement;

	if (typeof HTMLElement === 'function') {
		SvelteElement = class extends HTMLElement {
			/** The Svelte component constructor */
			$$ctor;
			/** Slots */
			$$s;
			/** The Svelte component instance */
			$$c;
			/** Whether or not the custom element is connected */
			$$cn = false;
			/** Component props data */
			$$d = {};
			/** `true` if currently in the process of reflecting component props back to attributes */
			$$r = false;
			/** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
			$$p_d = {};
			/** @type {Record<string, Function[]>} Event listeners */
			$$l = {};
			/** @type {Map<Function, Function>} Event listener unsubscribe functions */
			$$l_u = new Map();

			constructor($$componentCtor, $$slots, use_shadow_dom) {
				super();
				this.$$ctor = $$componentCtor;
				this.$$s = $$slots;
				if (use_shadow_dom) {
					this.attachShadow({ mode: 'open' });
				}
			}

			addEventListener(type, listener, options) {
				// We can't determine upfront if the event is a custom event or not, so we have to
				// listen to both. If someone uses a custom event with the same name as a regular
				// browser event, this fires twice - we can't avoid that.
				this.$$l[type] = this.$$l[type] || [];
				this.$$l[type].push(listener);
				if (this.$$c) {
					const unsub = this.$$c.$on(type, listener);
					this.$$l_u.set(listener, unsub);
				}
				super.addEventListener(type, listener, options);
			}

			removeEventListener(type, listener, options) {
				super.removeEventListener(type, listener, options);
				if (this.$$c) {
					const unsub = this.$$l_u.get(listener);
					if (unsub) {
						unsub();
						this.$$l_u.delete(listener);
					}
				}
			}

			async connectedCallback() {
				this.$$cn = true;
				if (!this.$$c) {
					// We wait one tick to let possible child slot elements be created/mounted
					await Promise.resolve();
					if (!this.$$cn) {
						return;
					}
					function create_slot(name) {
						return () => {
							let node;
							const obj = {
								c: function create() {
									node = element('slot');
									if (name !== 'default') {
										attr(node, 'name', name);
									}
								},
								/**
								 * @param {HTMLElement} target
								 * @param {HTMLElement} [anchor]
								 */
								m: function mount(target, anchor) {
									insert(target, node, anchor);
								},
								d: function destroy(detaching) {
									if (detaching) {
										detach(node);
									}
								}
							};
							return obj;
						};
					}
					const $$slots = {};
					const existing_slots = get_custom_elements_slots(this);
					for (const name of this.$$s) {
						if (name in existing_slots) {
							$$slots[name] = [create_slot(name)];
						}
					}
					for (const attribute of this.attributes) {
						// this.$$data takes precedence over this.attributes
						const name = this.$$g_p(attribute.name);
						if (!(name in this.$$d)) {
							this.$$d[name] = get_custom_element_value(name, attribute.value, this.$$p_d, 'toProp');
						}
					}
					// Port over props that were set programmatically before ce was initialized
					for (const key in this.$$p_d) {
						if (!(key in this.$$d) && this[key] !== undefined) {
							this.$$d[key] = this[key]; // don't transform, these were set through JavaScript
							delete this[key]; // remove the property that shadows the getter/setter
						}
					}
					this.$$c = new this.$$ctor({
						target: this.shadowRoot || this,
						props: {
							...this.$$d,
							$$slots,
							$$scope: {
								ctx: []
							}
						}
					});

					// Reflect component props as attributes
					const reflect_attributes = () => {
						this.$$r = true;
						for (const key in this.$$p_d) {
							this.$$d[key] = this.$$c.$$.ctx[this.$$c.$$.props[key]];
							if (this.$$p_d[key].reflect) {
								const attribute_value = get_custom_element_value(
									key,
									this.$$d[key],
									this.$$p_d,
									'toAttribute'
								);
								if (attribute_value == null) {
									this.removeAttribute(this.$$p_d[key].attribute || key);
								} else {
									this.setAttribute(this.$$p_d[key].attribute || key, attribute_value);
								}
							}
						}
						this.$$r = false;
					};
					this.$$c.$$.after_update.push(reflect_attributes);
					reflect_attributes(); // once initially because after_update is added too late for first render

					for (const type in this.$$l) {
						for (const listener of this.$$l[type]) {
							const unsub = this.$$c.$on(type, listener);
							this.$$l_u.set(listener, unsub);
						}
					}
					this.$$l = {};
				}
			}

			// We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
			// and setting attributes through setAttribute etc, this is helpful
			attributeChangedCallback(attr, _oldValue, newValue) {
				if (this.$$r) return;
				attr = this.$$g_p(attr);
				this.$$d[attr] = get_custom_element_value(attr, newValue, this.$$p_d, 'toProp');
				this.$$c?.$set({ [attr]: this.$$d[attr] });
			}

			disconnectedCallback() {
				this.$$cn = false;
				// In a microtask, because this could be a move within the DOM
				Promise.resolve().then(() => {
					if (!this.$$cn) {
						this.$$c.$destroy();
						this.$$c = undefined;
					}
				});
			}

			$$g_p(attribute_name) {
				return (
					Object.keys(this.$$p_d).find(
						(key) =>
							this.$$p_d[key].attribute === attribute_name ||
							(!this.$$p_d[key].attribute && key.toLowerCase() === attribute_name)
					) || attribute_name
				);
			}
		};
	}

	/**
	 * @param {string} prop
	 * @param {any} value
	 * @param {Record<string, CustomElementPropDefinition>} props_definition
	 * @param {'toAttribute' | 'toProp'} [transform]
	 */
	function get_custom_element_value(prop, value, props_definition, transform) {
		const type = props_definition[prop]?.type;
		value = type === 'Boolean' && typeof value !== 'boolean' ? value != null : value;
		if (!transform || !props_definition[prop]) {
			return value;
		} else if (transform === 'toAttribute') {
			switch (type) {
				case 'Object':
				case 'Array':
					return value == null ? null : JSON.stringify(value);
				case 'Boolean':
					return value ? '' : null;
				case 'Number':
					return value == null ? null : value;
				default:
					return value;
			}
		} else {
			switch (type) {
				case 'Object':
				case 'Array':
					return value && JSON.parse(value);
				case 'Boolean':
					return value; // conversion already handled above
				case 'Number':
					return value != null ? +value : value;
				default:
					return value;
			}
		}
	}

	/**
	 * @internal
	 *
	 * Turn a Svelte component into a custom element.
	 * @param {import('./public.js').ComponentType} Component  A Svelte component constructor
	 * @param {Record<string, CustomElementPropDefinition>} props_definition  The props to observe
	 * @param {string[]} slots  The slots to create
	 * @param {string[]} accessors  Other accessors besides the ones for props the component has
	 * @param {boolean} use_shadow_dom  Whether to use shadow DOM
	 * @param {(ce: new () => HTMLElement) => new () => HTMLElement} [extend]
	 */
	function create_custom_element(
		Component,
		props_definition,
		slots,
		accessors,
		use_shadow_dom,
		extend
	) {
		let Class = class extends SvelteElement {
			constructor() {
				super(Component, slots, use_shadow_dom);
				this.$$p_d = props_definition;
			}
			static get observedAttributes() {
				return Object.keys(props_definition).map((key) =>
					(props_definition[key].attribute || key).toLowerCase()
				);
			}
		};
		Object.keys(props_definition).forEach((prop) => {
			Object.defineProperty(Class.prototype, prop, {
				get() {
					return this.$$c && prop in this.$$c ? this.$$c[prop] : this.$$d[prop];
				},
				set(value) {
					value = get_custom_element_value(prop, value, props_definition);
					this.$$d[prop] = value;
					this.$$c?.$set({ [prop]: value });
				}
			});
		});
		accessors.forEach((accessor) => {
			Object.defineProperty(Class.prototype, accessor, {
				get() {
					return this.$$c?.[accessor];
				}
			});
		});
		if (extend) {
			// @ts-expect-error - assigning here is fine
			Class = extend(Class);
		}
		Component.element = /** @type {any} */ (Class);
		return Class;
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.10';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	/* wwwroot\js\App.svelte generated by Svelte v4.2.10 */
	const file = "wwwroot\\js\\App.svelte";

	function add_css(target) {
		append_styles(target, "svelte-mmdfh9", "h1.svelte-mmdfh9{font-size:5em}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsIm1hcHBpbmdzIjoiQUF3RUksZ0JBQUcsQ0FDQyxTQUFTLENBQUUsR0FDZiIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJBcHAuc3ZlbHRlIl19 */");
	}

	function create_fragment(ctx) {
		let main;
		let h10;
		let t0;
		let t1;
		let t2;
		let t3;
		let h11;
		let t4;
		let t5;
		let t6;
		let t7;
		let input0;
		let t8;
		let input1;
		let t9;
		let button;
		let t11;
		let p;
		let t13;
		let pre;
		let t14;
		let t15_value = (/*result*/ ctx[3] != undefined ? /*result*/ ctx[3] : '') + "";
		let t15;
		let t16;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				main = element("main");
				h10 = element("h1");
				t0 = text("Your name is ");
				t1 = text(/*name*/ ctx[0]);
				t2 = text("!");
				t3 = space();
				h11 = element("h1");
				t4 = text("and lastname is ");
				t5 = text(/*lastname*/ ctx[1]);
				t6 = text("!");
				t7 = space();
				input0 = element("input");
				t8 = space();
				input1 = element("input");
				t9 = space();
				button = element("button");
				button.textContent = "Post it.";
				t11 = space();
				p = element("p");
				p.textContent = "Result:";
				t13 = space();
				pre = element("pre");
				t14 = text("\t");
				t15 = text(t15_value);
				t16 = text("\r\n\t");
				attr_dev(h10, "id", /*id*/ ctx[2]);
				attr_dev(h10, "class", "svelte-mmdfh9");
				add_location(h10, file, 56, 4, 1551);
				attr_dev(h11, "id", /*id*/ ctx[2]);
				attr_dev(h11, "class", "svelte-mmdfh9");
				add_location(h11, file, 57, 1, 1593);
				add_location(input0, file, 59, 1, 1644);
				add_location(input1, file, 60, 1, 1674);
				attr_dev(button, "type", "button");
				add_location(button, file, 61, 1, 1708);
				add_location(p, file, 62, 1, 1768);
				add_location(pre, file, 65, 1, 1792);
				add_location(main, file, 53, 0, 1533);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, main, anchor);
				append_dev(main, h10);
				append_dev(h10, t0);
				append_dev(h10, t1);
				append_dev(h10, t2);
				append_dev(main, t3);
				append_dev(main, h11);
				append_dev(h11, t4);
				append_dev(h11, t5);
				append_dev(h11, t6);
				append_dev(main, t7);
				append_dev(main, input0);
				set_input_value(input0, /*name*/ ctx[0]);
				append_dev(main, t8);
				append_dev(main, input1);
				set_input_value(input1, /*lastname*/ ctx[1]);
				append_dev(main, t9);
				append_dev(main, button);
				append_dev(main, t11);
				append_dev(main, p);
				append_dev(main, t13);
				append_dev(main, pre);
				append_dev(pre, t14);
				append_dev(pre, t15);
				append_dev(pre, t16);

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
						listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
						listen_dev(button, "click", /*doPost*/ ctx[4], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);

				if (dirty & /*id*/ 4) {
					attr_dev(h10, "id", /*id*/ ctx[2]);
				}

				if (dirty & /*lastname*/ 2) set_data_dev(t5, /*lastname*/ ctx[1]);

				if (dirty & /*id*/ 4) {
					attr_dev(h11, "id", /*id*/ ctx[2]);
				}

				if (dirty & /*name*/ 1 && input0.value !== /*name*/ ctx[0]) {
					set_input_value(input0, /*name*/ ctx[0]);
				}

				if (dirty & /*lastname*/ 2 && input1.value !== /*lastname*/ ctx[1]) {
					set_input_value(input1, /*lastname*/ ctx[1]);
				}

				if (dirty & /*result*/ 8 && t15_value !== (t15_value = (/*result*/ ctx[3] != undefined ? /*result*/ ctx[3] : '') + "")) set_data_dev(t15, t15_value);
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(main);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('svelte-app', slots, []);
		let { id } = $$props;
		let { name } = $$props;
		let { lastname } = $$props;
		let result = '';

		async function doSomething() {
			debugger;

			const res = await fetch('', {
				method: 'POST',
				headers: {
					RequestVerificationToken: document.getElementsByName("__RequestVerificationToken")[0].value,
					'Content-Type': 'application/json; charset=utf-8;'
				}, /*,
	                'Content-Type': 'application/json',
	                Accept: 'application/json',*/
				body: JSON.stringify({ name, lastname })
			}); /*body: JSON.stringify({
		name,
		lastname
	})*/

			const json = await res.json();
			$$invalidate(3, result = JSON.stringify(json));
		}

		async function doPost() {
			const res = await fetch('', {
				method: 'POST',
				headers: {
					RequestVerificationToken: document.getElementsByName("__RequestVerificationToken")[0].value,
					'Content-Type': 'application/json; charset=utf-8;'
				}, /*,
	                'Content-Type': 'application/json',
	                Accept: 'application/json',*/
				body: JSON.stringify({ name, lastname })
			}); /*body: JSON.stringify({
		name,
		lastname
	})*/

			const json = await res.json();
			$$invalidate(3, result = JSON.stringify(json));
		}

		$$self.$$.on_mount.push(function () {
			if (id === undefined && !('id' in $$props || $$self.$$.bound[$$self.$$.props['id']])) {
				console.warn("<svelte-app> was created without expected prop 'id'");
			}

			if (name === undefined && !('name' in $$props || $$self.$$.bound[$$self.$$.props['name']])) {
				console.warn("<svelte-app> was created without expected prop 'name'");
			}

			if (lastname === undefined && !('lastname' in $$props || $$self.$$.bound[$$self.$$.props['lastname']])) {
				console.warn("<svelte-app> was created without expected prop 'lastname'");
			}
		});

		const writable_props = ['id', 'name', 'lastname'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<svelte-app> was created with unknown prop '${key}'`);
		});

		function input0_input_handler() {
			name = this.value;
			$$invalidate(0, name);
		}

		function input1_input_handler() {
			lastname = this.value;
			$$invalidate(1, lastname);
		}

		$$self.$$set = $$props => {
			if ('id' in $$props) $$invalidate(2, id = $$props.id);
			if ('name' in $$props) $$invalidate(0, name = $$props.name);
			if ('lastname' in $$props) $$invalidate(1, lastname = $$props.lastname);
		};

		$$self.$capture_state = () => ({
			id,
			name,
			lastname,
			result,
			doSomething,
			doPost
		});

		$$self.$inject_state = $$props => {
			if ('id' in $$props) $$invalidate(2, id = $$props.id);
			if ('name' in $$props) $$invalidate(0, name = $$props.name);
			if ('lastname' in $$props) $$invalidate(1, lastname = $$props.lastname);
			if ('result' in $$props) $$invalidate(3, result = $$props.result);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [name, lastname, id, result, doPost, input0_input_handler, input1_input_handler];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, { id: 2, name: 0, lastname: 1 }, add_css);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}

		get id() {
			return this.$$.ctx[2];
		}

		set id(id) {
			this.$$set({ id });
			flush();
		}

		get name() {
			return this.$$.ctx[0];
		}

		set name(name) {
			this.$$set({ name });
			flush();
		}

		get lastname() {
			return this.$$.ctx[1];
		}

		set lastname(lastname) {
			this.$$set({ lastname });
			flush();
		}
	}

	customElements.define("svelte-app", create_custom_element(App, {"id":{},"name":{},"lastname":{}}, [], [], true));

	/** @returns {void} */
	function onMount() {}

	/* wwwroot\js\Clock.svelte generated by Svelte v4.2.10 */
	const file$1 = "wwwroot\\js\\Clock.svelte";

	function add_css$1(target) {
		append_styles(target, "svelte-1p5wnm2", "svg.svelte-1p5wnm2{width:100%;height:100%}.clock-face.svelte-1p5wnm2{stroke:#333;fill:white}.minor.svelte-1p5wnm2{stroke:#999;stroke-width:0.5}.major.svelte-1p5wnm2{stroke:#333;stroke-width:1}.hour.svelte-1p5wnm2{stroke:#333}.minute.svelte-1p5wnm2{stroke:#666}.second.svelte-1p5wnm2,.second-counterweight.svelte-1p5wnm2{stroke:rgb(180,0,0)}.second-counterweight.svelte-1p5wnm2{stroke-width:3}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2xvY2suc3ZlbHRlIiwibWFwcGluZ3MiOiJBQXdCSSxrQkFBSSxDQUNBLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQ1osQ0FFQSwwQkFBWSxDQUNSLE1BQU0sQ0FBRSxJQUFJLENBQ1osSUFBSSxDQUFFLEtBQ1YsQ0FFQSxxQkFBTyxDQUNILE1BQU0sQ0FBRSxJQUFJLENBQ1osWUFBWSxDQUFFLEdBQ2xCLENBRUEscUJBQU8sQ0FDSCxNQUFNLENBQUUsSUFBSSxDQUNaLFlBQVksQ0FBRSxDQUNsQixDQUVBLG9CQUFNLENBQ0YsTUFBTSxDQUFFLElBQ1osQ0FFQSxzQkFBUSxDQUNKLE1BQU0sQ0FBRSxJQUNaLENBRUEsc0JBQU8sQ0FBRSxvQ0FBc0IsQ0FDM0IsTUFBTSxDQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3ZCLENBRUEsb0NBQXNCLENBQ2xCLFlBQVksQ0FBRSxDQUNsQiIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJDbG9jay5zdmVsdGUiXX0= */");
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[7] = list[i];
		return child_ctx;
	}

	// (74:8) {#each [1, 2, 3, 4] as offset}
	function create_each_block_1(ctx) {
		let line;

		const block = {
			c: function create() {
				line = svg_element("line");
				attr_dev(line, "class", "minor svelte-1p5wnm2");
				attr_dev(line, "y1", "42");
				attr_dev(line, "y2", "45");
				attr_dev(line, "transform", "rotate(" + 6 * (/*minute*/ ctx[4] + /*offset*/ ctx[7]) + ")");
				add_location(line, file$1, 74, 12, 1451);
			},
			m: function mount(target, anchor) {
				insert_dev(target, line, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(line);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1.name,
			type: "each",
			source: "(74:8) {#each [1, 2, 3, 4] as offset}",
			ctx
		});

		return block;
	}

	// (66:4) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}
	function create_each_block(ctx) {
		let line;
		let each_1_anchor;
		let each_value_1 = ensure_array_like_dev([1, 2, 3, 4]);
		let each_blocks = [];

		for (let i = 0; i < 4; i += 1) {
			each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				line = svg_element("line");

				for (let i = 0; i < 4; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
				attr_dev(line, "class", "major svelte-1p5wnm2");
				attr_dev(line, "y1", "35");
				attr_dev(line, "y2", "45");
				attr_dev(line, "transform", "rotate(" + 30 * /*minute*/ ctx[4] + ")");
				add_location(line, file$1, 66, 8, 1246);
			},
			m: function mount(target, anchor) {
				insert_dev(target, line, anchor);

				for (let i = 0; i < 4; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(target, anchor);
					}
				}

				insert_dev(target, each_1_anchor, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(line);
					detach_dev(each_1_anchor);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(66:4) {#each [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as minute}",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let svg;
		let circle;
		let line0;
		let line0_transform_value;
		let line1;
		let line1_transform_value;
		let g;
		let line2;
		let line3;
		let g_transform_value;
		let each_value = ensure_array_like_dev([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
		let each_blocks = [];

		for (let i = 0; i < 12; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				svg = svg_element("svg");
				circle = svg_element("circle");

				for (let i = 0; i < 12; i += 1) {
					each_blocks[i].c();
				}

				line0 = svg_element("line");
				line1 = svg_element("line");
				g = svg_element("g");
				line2 = svg_element("line");
				line3 = svg_element("line");
				attr_dev(circle, "class", "clock-face svelte-1p5wnm2");
				attr_dev(circle, "r", "48");
				add_location(circle, file$1, 62, 4, 1107);
				attr_dev(line0, "class", "hour svelte-1p5wnm2");
				attr_dev(line0, "y1", "2");
				attr_dev(line0, "y2", "-20");
				attr_dev(line0, "transform", line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[1] / 2) + ")");
				add_location(line0, file$1, 84, 4, 1692);
				attr_dev(line1, "class", "minute svelte-1p5wnm2");
				attr_dev(line1, "y1", "4");
				attr_dev(line1, "y2", "-30");
				attr_dev(line1, "transform", line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[1] + /*seconds*/ ctx[0] / 10) + ")");
				add_location(line1, file$1, 92, 4, 1867);
				attr_dev(line2, "class", "second svelte-1p5wnm2");
				attr_dev(line2, "y1", "10");
				attr_dev(line2, "y2", "-38");
				add_location(line2, file$1, 101, 8, 2093);
				attr_dev(line3, "class", "second-counterweight svelte-1p5wnm2");
				attr_dev(line3, "y1", "10");
				attr_dev(line3, "y2", "2");
				add_location(line3, file$1, 102, 8, 2142);
				attr_dev(g, "transform", g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[0] + ")");
				add_location(g, file$1, 100, 4, 2046);
				attr_dev(svg, "viewBox", "-50 -50 100 100");
				attr_dev(svg, "class", "svelte-1p5wnm2");
				add_location(svg, file$1, 61, 0, 1070);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, svg, anchor);
				append_dev(svg, circle);

				for (let i = 0; i < 12; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(svg, null);
					}
				}

				append_dev(svg, line0);
				append_dev(svg, line1);
				append_dev(svg, g);
				append_dev(g, line2);
				append_dev(g, line3);
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*hours, minutes*/ 6 && line0_transform_value !== (line0_transform_value = "rotate(" + (30 * /*hours*/ ctx[2] + /*minutes*/ ctx[1] / 2) + ")")) {
					attr_dev(line0, "transform", line0_transform_value);
				}

				if (dirty & /*minutes, seconds*/ 3 && line1_transform_value !== (line1_transform_value = "rotate(" + (6 * /*minutes*/ ctx[1] + /*seconds*/ ctx[0] / 10) + ")")) {
					attr_dev(line1, "transform", line1_transform_value);
				}

				if (dirty & /*seconds*/ 1 && g_transform_value !== (g_transform_value = "rotate(" + 6 * /*seconds*/ ctx[0] + ")")) {
					attr_dev(g, "transform", g_transform_value);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(svg);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let hours;
		let minutes;
		let seconds;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('svg-clock', slots, []);
		let time = new Date();

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<svg-clock> was created with unknown prop '${key}'`);
		});

		$$self.$capture_state = () => ({ onMount, time, seconds, minutes, hours });

		$$self.$inject_state = $$props => {
			if ('time' in $$props) $$invalidate(3, time = $$props.time);
			if ('seconds' in $$props) $$invalidate(0, seconds = $$props.seconds);
			if ('minutes' in $$props) $$invalidate(1, minutes = $$props.minutes);
			if ('hours' in $$props) $$invalidate(2, hours = $$props.hours);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*time*/ 8) {
				// these automatically update when `time`
				// changes, because of the `$:` prefix
				$$invalidate(2, hours = time.getHours());
			}

			if ($$self.$$.dirty & /*time*/ 8) {
				$$invalidate(1, minutes = time.getMinutes());
			}

			if ($$self.$$.dirty & /*time*/ 8) {
				$$invalidate(0, seconds = time.getSeconds());
			}
		};

		return [seconds, minutes, hours, time];
	}

	class Clock extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, {}, add_css$1);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "Clock",
				options,
				id: create_fragment$1.name
			});
		}
	}

	customElements.define("svg-clock", create_custom_element(Clock, {}, [], [], true));

}());

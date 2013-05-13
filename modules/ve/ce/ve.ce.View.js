/*!
 * VisualEditor ContentEditable View class.
 *
 * @copyright 2011-2013 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Generic base class for CE views.
 *
 * @abstract
 * @extends ve.Element
 * @mixins ve.EventEmitter
 *
 * @constructor
 * @param {ve.dm.Model} model Model to observe
 * @param {Object} [config] Config options
 */
ve.ce.View = function VeCeView( model, config ) {
	// Setting this property before calling the parent constructor allows overriden #getTagName
	// methods in view classes to have access to the model when they are called for the first time
	// inside of ve.Element
	this.model = model;

	// Parent constructor
	ve.Element.call( this, config );

	// Mixin constructors
	ve.EventEmitter.call( this );

	// Properties
	this.live = false;

	// Events
	this.connect( this, {
		'setup': 'onSetup',
		'teardown': 'onTeardown'
	} );

	// Initialization
	this.renderAttributes( this.model.getAttributes() );
};

/* Inheritance */

ve.inheritClass( ve.ce.View, ve.Element );

ve.mixinClass( ve.ce.View, ve.EventEmitter );

/* Events */

/**
 * @event live
 */

/* Static Members */

/**
 * Allowed attributes for DOM elements.
 *
 * This list includes attributes that are generally safe to include in HTML loaded from a
 * foreign source and displaying it inside the browser. It doesn't include any event attributes,
 * for instance, which would allow arbitrary JavaScript execution. This alone is not enough to
 * make HTML safe to display, but it helps.
 *
 * TODO: Rather than use a single global list, set these on a per-view basis to something that makes
 * sense for that view in particular.
 *
 * @static
 * @property static.domAttributeWhitelist
 * @inheritable
 */
ve.ce.View.static.domAttributeWhitelist = [
	'abbr', 'about', 'align', 'alt', 'axis', 'bgcolor', 'border', 'cellpadding', 'cellspacing',
	'char', 'charoff', 'cite', 'class', 'clear', 'color', 'colspan', 'datatype', 'datetime',
	'dir', 'face', 'frame', 'headers', 'height', 'href', 'id', 'itemid', 'itemprop', 'itemref',
	'itemscope', 'itemtype', 'lang', 'noshade', 'nowrap', 'property', 'rbspan', 'rel',
	'resource', 'rev', 'rowspan', 'rules', 'scope', 'size', 'span', 'src', 'start', 'style',
	'summary', 'title', 'type', 'typeof', 'valign', 'value', 'width'
];

/**
 * Whether or not HTML attributes listed in domAttributeWhitelist and present in HTMLDOM should be
 * added to node anchor (this.$).
 *
 * @static
 * @property static.renderHtmlAttributes
 * @inheritable
 */
ve.ce.View.static.renderHtmlAttributes = true;

/* Methods */

/**
 * Handle setup event.
 *
 * @method
 */
ve.ce.View.prototype.onSetup = function () {
	this.$.data( 'view', this );
};

/**
 * Handle teardown event.
 *
 * @method
 */
ve.ce.View.prototype.onTeardown = function () {
	this.$.removeData( 'view' );
};

/**
 * Get the model the view observes.
 *
 * @method
 * @returns {ve.dm.Node} Model the view observes
 */
ve.ce.View.prototype.getModel = function () {
	return this.model;
};

/**
 * Check if the view is attached to the live DOM.
 *
 * @method
 * @returns {boolean} View is attached to the live DOM
 */
ve.ce.View.prototype.isLive = function () {
	return this.live;
};

/**
 * Set live state.
 *
 * @method
 * @param {boolean} live The view has been attached to the live DOM (use false on detach)
 * @emits live
 */
ve.ce.View.prototype.setLive = function ( live ) {
	this.live = live;
	this.emit( 'live' );
	if ( this.live ) {
		this.emit( 'setup' );
	} else {
		this.emit( 'teardown' );
	}
};

/**
 * Render HTML attributes.
 *
 * Attributes will be parsed using ve.dm.Converter#parseHtmlAttribute and filtered through the
 * whitelist defined in #domAttributeWhitelist
 *
 * @param {Object} attributes List of attributes to render in the DOM
 */
ve.ce.View.prototype.renderAttributes = function ( attributes ) {
	var key, parsed,
		whitelist = this.constructor.static.domAttributeWhitelist;
	if ( !this.constructor.static.renderHtmlAttributes ) {
		return;
	}
	for ( key in attributes ) {
		parsed = ve.dm.Converter.parseHtmlAttribute( key, this.$ );
		if ( parsed && whitelist.indexOf( parsed.attribute ) !== -1 ) {
			if ( attributes[key] === undefined ) {
				parsed.domElement.removeAttribute( parsed.attribute );
			} else {
				parsed.domElement.setAttribute( parsed.attribute, attributes[key] );
			}
		}
	}
};

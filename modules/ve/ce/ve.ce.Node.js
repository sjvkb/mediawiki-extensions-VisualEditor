/*!
 * VisualEditor ContentEditable Node class.
 *
 * @copyright 2011-2012 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * Generic ContentEditable node.
 *
 * @abstract
 * @extends ve.Node
 *
 * @constructor
 * @param {string} type Symbolic name of node type
 * @param {ve.dm.Node} model Model to observe
 * @param {jQuery} [$element] Element to use as a container
 */
ve.ce.Node = function VeCeNode( type, model, $element ) {
	// Parent constructor
	ve.Node.call( this, type );

	// Properties
	this.model = model;
	this.$ = $element || $( '<div>' );
	this.parent = null;
	this.live = false;

	// Events
	this.model.on( 'attributeChange', ve.bind( this.onAttributeChange, this ) );

	// Initialization
	this.$.data( 'node', this );
	ve.setDomAttributes(
		this.$[0],
		this.model.getAttributes( 'html/' ),
		this.constructor.static.domAttributeWhitelist
	);
};

/* Inheritance */

ve.inheritClass( ve.ce.Node, ve.Node );

/* Static Members */

/**
 * @static
 * @property
 * @inheritable
 */
ve.ce.Node.static = {};

/**
 * Whether this node type can be split.
 *
 * When the user presses Enter, we split the node they're in (if splittable), then split its parent
 * if splittable, and continue traversing up the tree and stop at the first non-splittable node.
 *
 * @static
 * @property static.canBeSplit
 * @inheritable
 */
ve.ce.Node.static.canBeSplit = false;

/**
 * Allowed attributes for DOM elements.
 *
 * This list includes attributes that are generally safe to include in HTML loaded from a
 * foreign source and displaying it inside the browser. It doesn't include any event attributes,
 * for instance, which would allow arbitrary JavaScript execution. This alone is not enough to
 * make HTML safe to display, but it helps.
 *
 * TODO: Rather than use a single global list, set these on a per-node basis to something that makes
 * sense for that node in particular.
 *
 * @static
 * @property static.domAttributeWhitelist
 * @inheritable
 */
ve.ce.Node.static.domAttributeWhitelist = [
	'abbr', 'about', 'align', 'alt', 'axis', 'bgcolor', 'border', 'cellpadding', 'cellspacing',
	'char', 'charoff', 'cite', 'class', 'clear', 'color', 'colspan', 'datatype', 'datetime',
	'dir', 'face', 'frame', 'headers', 'height', 'href', 'id', 'itemid', 'itemprop', 'itemref',
	'itemscope', 'itemtype', 'lang', 'noshade', 'nowrap', 'property', 'rbspan', 'rel',
	'resource', 'rev', 'rowspan', 'rules', 'scope', 'size', 'span', 'src', 'start', 'style',
	'summary', 'title', 'type', 'typeof', 'valign', 'value', 'width'
];

/**
 * Template for shield elements.
 *
 * Uses data URI to inject a 1x1 transparent PNG image into the DOM.
 *
 * Using transparent png instead of gif because IE 10 renders gif as solid red when used as img src.
 *
 * @static
 * @property static.$shieldTemplate
 * @inheritable
 */
ve.ce.Node.static.$shieldTemplate = $( '<img>' )
	.addClass( 've-ce-node-shield' )
	.attr( 'src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4' +
		'XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=' );

/* Methods */

/**
 * Handle attribute change events.
 *
 * Whitelisted attributes will be added or removed in sync with the DOM. They are initially set in
 * the constructor.
 *
 * @method
 * @param {string} key Attribute key
 * @param {string} from Old value
 * @param {string} to New value
 */
ve.ce.Node.prototype.onAttributeChange = function ( key, from, to ) {
	var htmlKey = key.substr( 5 ).toLowerCase();
	if (
		key.indexOf( 'html/' ) === 0 &&
		htmlKey.length &&
		this.constructor.static.domAttributeWhitelist.indexOf( htmlKey ) !== -1
	) {
		if ( to === undefined ) {
			this.$.removeAttr( htmlKey );
		} else {
			this.$.attr( htmlKey, to );
		}
	}
};

/**
 * Get allowed child node types.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {string[]|null} List of node types allowed as children or null if any type is allowed
 */
ve.ce.Node.prototype.getChildNodeTypes = function () {
	return this.model.getChildNodeTypes();
};

/**
 * Get allowed parent node types.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {string[]|null} List of node types allowed as parents or null if any type is allowed
 */
ve.ce.Node.prototype.getParentNodeTypes = function () {
	return this.model.getParentNodeTypes();
};

/**
 * Check if the node can have children.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {boolean} Model node can have children
 */
ve.ce.Node.prototype.canHaveChildren = function () {
	return this.model.canHaveChildren();
};

/**
 * Check if the node can have grandchildren.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {boolean} Model node can have grandchildren
 */
ve.ce.Node.prototype.canHaveGrandchildren = function () {
	return this.model.canHaveGrandchildren();
};

/**
 * Check if the node has a wrapped element in the document data.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {boolean} Model node is a wrapped element
 */
ve.ce.Node.prototype.isWrapped = function () {
	return this.model.isWrapped();
};

/**
 * Check if the node can contain content.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {boolean} Node can contain content
 */
ve.ce.Node.prototype.canContainContent = function () {
	return this.model.canContainContent();
};

/**
 * Check if the node is content.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {boolean} Node is content
 */
ve.ce.Node.prototype.isContent = function () {
	return this.model.isContent();
};

/**
 * Check if the node can have a slug before it.
 *
 * TODO: Figure out a way to remove the hard-coding for text nodes here.
 *
 * @static
 * @method
 * @returns {boolean} Whether the node can have a slug before it
 */
ve.ce.Node.prototype.canHaveSlugBefore = function () {
	return !this.canContainContent() && this.getParentNodeTypes() === null && this.type !== 'text';
};

/**
 * Check if the node can have a slug after it.
 *
 * @static
 * @method
 * @returns {boolean} Whether the node can have a slug after it
 */
ve.ce.Node.prototype.canHaveSlugAfter = ve.ce.Node.prototype.canHaveSlugBefore;

/**
 * Get the length of the node.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {number} Model length
 */
ve.ce.Node.prototype.getLength = function () {
	return this.model.getLength();
};

/**
 * Get the outer length of the node, which includes wrappers if present.
 *
 * This method passes through to the model.
 *
 * @method
 * @returns {number} Model outer length
 */
ve.ce.Node.prototype.getOuterLength = function () {
	return this.model.getOuterLength();
};

/**
 * Check if the node can be split.
 *
 * @method
 * @returns {boolean} Node can be split
 */
ve.ce.Node.prototype.canBeSplit = function () {
	return this.constructor.static.canBeSplit;
};

/**
 * Get the model the node observes.
 *
 * @method
 * @returns {ve.dm.Node} Model the node observes
 */
ve.ce.Node.prototype.getModel = function () {
	return this.model;
};

/**
 * Get the closest splittable node upstream.
 *
 * @method
 * @returns {ve.ce.Node} Closest splittable node
 */
ve.ce.Node.getSplitableNode = function ( node ) {
	var splitableNode = null;

	ve.Node.traverseUpstream( node, function ( node ) {
		if ( node.canBeSplit() ) {
			splitableNode = node;
			return true;
		} else {
			return false;
		}
	} );

	return splitableNode;
};

/**
 * Check if the node is attached to the live DOM.
 *
 * @method
 * @returns {boolean} Node is attached to the live DOM
 */
ve.ce.Node.prototype.isLive = function () {
	return this.live;
};

/**
 * Set live state.
 *
 * @method
 * @param {boolean} live The node has been attached to the live DOM (use false on detach)
 */
ve.ce.Node.prototype.setLive = function ( live ) {
	this.live = live;
	this.emit( 'live' );
};

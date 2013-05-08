/*!
 * VisualEditor ContentEditable ProtectedNode class.
 *
 * @copyright 2011-2013 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * ContentEditable relocatable node.
 *
 * @class
 * @abstract
 *
 * @constructor
 */
ve.ce.ProtectedNode = function VeCeProtectedNode() {
	// Properties
	this.$phantoms = $( [] );
	this.$shields = $( [] );

	// Events
	this.connect( this, { 'live': 'onProtectedLive' } );
	this.$.on( 'mouseenter', ve.bind( this.onProtectedMouseEnter, this ) );

	// Initialization
	this.$.addClass( 've-ce-protectedNode' );
};

/* Static Properties */

ve.ce.ProtectedNode.static = {};

/**
 * Template for shield elements.
 *
 * Uses data URI to inject a 1x1 transparent PNG image into the DOM.
 *
 * Using transparent png instead of gif because IE 10 renders gif as solid red when used as img src.
 *
 * @property {jQuery}
 * @static
 * @inheritable
 */
ve.ce.ProtectedNode.static.$shieldTemplate = $( '<img>' )
	.addClass( 've-ce-protectedNode-shield' )
	.attr( 'src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4' +
		'XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=' );

/**
 * Phantom element template.
 *
 * @property {jQuery}
 * @static
 * @inheritable
 */
ve.ce.ProtectedNode.static.$phantomTemplate = $( '<div>' )
	.addClass( 've-ce-protectedNode-phantom' )
	.attr( 'draggable', false );

/* Methods */

/**
 * Handle live events.
 *
 * @method
 */
ve.ce.ProtectedNode.prototype.onProtectedLive = function () {
	var $shield,
		node = this,
		$shieldTemplate = this.constructor.static.$shieldTemplate,
		surfaceModel = this.getRoot().getSurface().getModel();

	if ( this.isLive() ) {
		// Events
		surfaceModel.connect( this, { 'change': 'onSurfaceModelChange' } );

		// Shields
		this.$.add( this.$.find( '*' ) ).each( function () {
			var $this = $( this );
			if ( this.nodeType === Node.ELEMENT_NODE ) {
				if (
					( $this.css( 'float' ) === 'none' || $this.css( 'float' ) === '' ) &&
					!$this.hasClass( 've-ce-protectedNode' )
				) {
					return;
				}
				$shield = $shieldTemplate.clone().appendTo( $this );
				node.$shields = node.$shields.add( $shield );
				$this.append( $shieldTemplate.clone() );
			}
		} );
	} else {
		surfaceModel.disconnect( this, { 'change': 'onSurfaceModelChange' } );
		this.$shields.remove();
		this.$shields = $( [] );
	}
};

/**
 * Handle phantom click events.
 *
 * @method
 * @param {jQuery.Event} e Mouse click event
 */
ve.ce.ProtectedNode.prototype.onPhantomClick = function ( e ) {
	var surfaceModel = this.getRoot().getSurface().getModel(),
		selectionRange = surfaceModel.getSelection(),
		nodeRange = this.model.getOuterRange();

	surfaceModel.getFragment(
		e.shiftKey ?
			ve.Range.newCoveringRange(
				[ selectionRange, nodeRange ], selectionRange.from > nodeRange.from
			) :
			nodeRange
	).select();
};

/**
 * Handle mouse enter events.
 *
 * @method
 */
ve.ce.ProtectedNode.prototype.onProtectedMouseEnter = function () {
	if ( !this.root.getSurface().dragging ) {
		this.createPhantoms();
	}
};

/**
 * Handle surface mouse move events.
 *
 * @method
 * @param {jQuery.Event} e Mouse move event
 */
ve.ce.ProtectedNode.prototype.onSurfaceMouseMove = function ( e ) {
	var $target = $( e.target );
	if (
		!$target.hasClass( 've-ce-protectedNode-phantom' ) &&
		$target.closest( '.ve-ce-protectedNode' ).length === 0
	) {
		this.clearPhantoms();
	}
};

/**
 * Handle surface mouse out events.
 *
 * @method
 * @param {jQuery.Event} e
 */
ve.ce.ProtectedNode.prototype.onSurfaceMouseOut = function ( e ) {
	if ( e.toElement === null ) {
		this.clearPhantoms();
	}
};

/**
 * Handle surface model change events
 *
 * @method
 */
ve.ce.ProtectedNode.prototype.onSurfaceModelChange = function () {
	if ( this.$phantoms.length ) {
		this.positionPhantoms();
	}
};

/**
 * Creates phantoms
 *
 * @method
 */
ve.ce.ProtectedNode.prototype.createPhantoms = function () {
	var $phantomTemplate = this.constructor.static.$phantomTemplate,
		surface = this.root.getSurface();

	this.$.find( '.ve-ce-protectedNode-shield' ).each(
		ve.bind( function () {
			this.$phantoms = this.$phantoms.add(
				$phantomTemplate.clone().on( 'click', ve.bind( this.onPhantomClick, this ) )
			);
		}, this )
	);
	this.positionPhantoms();
	surface.replacePhantoms( this.$phantoms );

	surface.$.on( {
		'mousemove.ve-ce-protectedNode': ve.bind( this.onSurfaceMouseMove, this ),
		'mouseout.ve-ce-protectedNode': ve.bind( this.onSurfaceMouseOut, this )
	} );
};

/**
 * Positions phantoms
 *
 * @method
 */
ve.ce.ProtectedNode.prototype.positionPhantoms = function () {
	this.$.find( '.ve-ce-protectedNode-shield' ).each(
		ve.bind( function ( i, element ) {
			var $shield = $( element ),
				offset = $shield.offset();
			this.$phantoms.eq( i ).css( {
				'top': offset.top,
				'left': offset.left,
				'height': $shield.height(),
				'width': $shield.width(),
				'background-position': -offset.left + 'px ' + -offset.top + 'px'
			} );
		}, this )
	);
};

/**
 * Clears all phantoms and unbinds .ve-ce-protectedNode namespace event handlers
 *
 * @method
 */
ve.ce.ProtectedNode.prototype.clearPhantoms = function () {
	var surface = this.root.getSurface();
	surface.replacePhantoms( null );
	surface.$.unbind( '.ve-ce-protectedNode' );
	this.$phantoms = $( [] );
};
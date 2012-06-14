/**
 * DataModel node for a table cell.
 *
 * @class
 * @constructor
 * @extends {ve.dm.BranchNode}
 * @param {ve.dm.BranchNode[]} [children] Child nodes to attach
 * @param {Object} [attributes] Reference to map of attribute key/value pairs
 */
ve.dm.TableCellNode = function( children, attributes ) {
	// Inheritance
	ve.dm.BranchNode.call( this, 'tableCell', children, attributes );
};

/* Static Members */

/**
 * Node rules.
 *
 * @see ve.dm.NodeFactory
 * @static
 * @member
 */
ve.dm.TableCellNode.rules = {
	'isWrapped': true,
	'isContent': false,
	'canContainContent': false,
	'childNodeTypes': null,
	'parentNodeTypes': ['tableRow']
};

/**
 * Node converters.
 *
 * @see {ve.dm.Converter}
 * @static
 * @member
 */
ve.dm.TableCellNode.converters = {
	'domElementTypes': ['td', 'th'],
	'toDomElement': function( type, element ) {
		return element.attributes && ( {
			'data': document.createElement( 'td' ),
			'header': document.createElement( 'th' )
		} )[element.attributes['style']];
	},
	'toDataElement': function( tag, element ) {
		return ( {
			'td': { 'type': 'tableCell', 'attributes': { 'style': 'data' } },
			'th': { 'type': 'tableCell', 'attributes': { 'style': 'header' } }
		} )[tag];
	}
};

/* Registration */

ve.dm.nodeFactory.register( 'tableCell', ve.dm.TableCellNode );

/* Inheritance */

ve.extendClass( ve.dm.TableCellNode, ve.dm.BranchNode );
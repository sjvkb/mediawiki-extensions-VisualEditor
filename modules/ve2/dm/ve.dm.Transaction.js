/**
 * DataModel transaction.
 *
 * @class
 * @constructor
 */
ve.dm.Transaction = function() {
	this.operations = [];
	this.lengthDifference = 0;
};

/* Static Methods */

/**
 * Generates a transaction that inserts data at a given offset.
 *
 * @static
 * @method
 * @param {ve.dm.Document} doc Document to create transaction for
 * @param {Integer} offset Offset to insert at
 * @param {Array} data Data to insert
 * @returns {ve.dm.Transaction} Transcation that inserts data
 */
ve.dm.Transaction.newFromInsertion = function( doc, offset, insertion ) {
	var tx = new ve.dm.Transaction(),
		data = doc.getData();
	// Fix up the insertion
	insertion = doc.fixupInsertion( insertion, offset );
	// Retain up to insertion point, if needed
	tx.pushRetain( offset );
	// Insert data
	tx.pushReplace( [], insertion );
	// Retain to end of document, if needed (for completeness)
	tx.pushRetain( data.length - offset );
	return tx;
};

/**
 * Generates a transaction which removes data from a given range.
 *
 * There are three possible results from a removal:
 *    1. Remove content only
 *       - Occurs when the range starts and ends on elements of different type, depth or ancestry
 *    2. Remove entire elements and their content
 *       - Occurs when the range spans across an entire element
 *    3. Merge two elements by removing the end of one and the beginning of another
 *       - Occurs when the range starts and ends on elements of similar type, depth and ancestry
 *
 * This function uses the following logic to decide what to actually remove:
 *     1. Elements are only removed if range being removed covers the entire element
 *     2. Elements can only be merged if ve.dm.Node.canBeMergedWith() returns true
 *     3. Merges take place at the highest common ancestor
 *
 * @method
 * @param {ve.dm.Document} doc Document to create transaction for
 * @param {ve.Range} range Range of data to remove
 * @returns {ve.dm.Transaction} Transcation that removes data
 * @throws 'Invalid range, can not remove from {range.start} to {range.end}'
 */
ve.dm.Transaction.newFromRemoval = function( doc, range ) {
	var tx = new ve.dm.Transaction(),
		data = doc.getData();
	// Normalize and validate range
	range.normalize();
	if ( range.start === range.end ) {
		// Empty range, nothing to remove, retain up to the end of the document (for completeness)
		tx.pushRetain( data.length );
		return tx;
	}
	// Select nodes and validate selection
	var selection = doc.selectNodes( range, 'covered' );
	if ( selection.length === 0 ) {
		// Empty selection? Something is wrong!
		throw 'Invalid range, cannot remove from ' + range.start + ' to ' + range.end;
	}

	var first, last, offset = 0, removeStart = null, removeEnd = null, nodeStart, nodeEnd;
	first = selection[0];
	last = selection[selection.length - 1];
	// If the first and last node are mergeable, merge them
	if ( first.node.canBeMergedWith( last.node ) ) {
		if ( !first.range && !last.range ) {
			// First and last node are both completely covered, remove them
			removeStart = first.nodeOuterRange.start;
			removeEnd = last.nodeOuterRange.end;
		} else {
			// Either the first node or the last node is partially covered, so remove
			// the selected content
			removeStart = ( first.range || first.nodeRange ).start;
			removeEnd = ( last.range || last.nodeRange ).end;
		}
		tx.pushRetain( removeStart );
		tx.pushReplace( data.slice( removeStart, removeEnd ), [] );
		tx.pushRetain( data.length - removeEnd );
		// All done
		return tx;
	}

	// The selection wasn't mergeable, so remove nodes that are completely covered, and strip
	// nodes that aren't
	for ( i = 0; i < selection.length; i++ ) {
		if ( !selection[i].range ) {
			// Entire node is covered, remove it
			nodeStart = selection[i].nodeOuterRange.start;
			nodeEnd = selection[i].nodeOuterRange.end;
		} else {
			// Part of the node is covered, remove that range
			nodeStart = selection[i].range.start;
			nodeEnd = selection[i].range.end;
		}

		// Merge contiguous removals. Only apply a removal when a gap appears, or at the
		// end of the loop
		if ( removeEnd === null ) {
			// First removal
			removeStart = nodeStart;
			removeEnd = nodeEnd;
		} else if ( removeEnd === nodeStart ) {
			// Merge this removal into the previous one
			removeEnd = nodeEnd;
		} else {
			// There is a gap between the previous removal and this one

			// Push the previous removal first
			tx.pushRetain( removeStart - offset );
			tx.pushReplace( data.slice( removeStart, removeEnd ), [] );
			offset = removeEnd;

			// Now start this removal
			removeStart = nodeStart;
			removeEnd = nodeEnd;
		}
	}
	// Apply the last removal, if any
	if ( removeEnd !== null ) {
		tx.pushRetain( removeStart - offset );
		tx.pushReplace( data.slice( removeStart, removeEnd ), [] );
		offset = removeEnd;
	}
	// Retain up to the end of the document
	tx.pushRetain( data.length - offset );
	return tx;
};

/**
 * Generates a transaction that changes an attribute.
 *
 * @static
 * @method
 * @param {ve.dm.Document} doc Document to create transaction for
 * @param {Integer} offset Offset of element
 * @param {String} key Attribute name
 * @param {Mixed} value New value
 * @returns {ve.dm.Transaction} Transcation that changes an element
 * @throws 'Can not set attributes to non-element data'
 * @throws 'Can not set attributes on closing element'
 */
ve.dm.Transaction.newFromAttributeChange = function( doc, offset, key, value ) {
	var tx = new ve.dm.Transaction(),
		data = doc.getData();
	// Verify element exists at offset
	if ( data[offset].type === undefined ) {
		throw 'Can not set attributes to non-element data';
	}
	// Verify element is not a closing
	if ( data[offset].type.charAt( 0 ) === '/' ) {
		throw 'Can not set attributes on closing element';
	}
	// Retain up to element
	tx.pushRetain( offset );
	// Change attribute
	tx.pushReplaceElementAttribute(
		key, 'attributes' in data[offset] ? data[offset].attributes[key] : undefined, value
	);
	// Retain to end of document
	tx.pushRetain( data.length - offset );
	return tx;
};

/**
 * Generates a transaction that annotates content.
 *
 * @static
 * @method
 * @param {ve.dm.Document} doc Document to create transaction for
 * @param {ve.Range} range Range to annotate
 * @param {String} method Annotation mode
 *     'set': Adds annotation to all content in range
 *     'clear': Removes instances of annotation from content in range
 * @param {Object} annotation Annotation to set or clear
 * @returns {ve.dm.Transaction} Transcation that annotates content
 */
ve.dm.Transaction.newFromAnnotation = function( doc, range, method, annotation ) {
	var tx = new ve.dm.Transaction(),
		data = doc.getData(),
		hash = ve.getHash( annotation );
	// Iterate over all data in range, annotating where appropriate
	range.normalize();
	var i = range.start,
		span = i,
		on = false;
	while ( i < range.end ) {
		if ( data[i].type !== undefined ) {
			// Element
			if ( on ) {
				tx.pushRetain( span );
				tx.pushStopAnnotating( method, annotation );
				span = 0;
				on = false;
			}
		} else {
			// Content
			var covered = doc.offsetContainsAnnotation( i, annotation );
			if ( ( covered && method === 'set' ) || ( !covered  && method === 'clear' ) ) {
				// Skip annotated content
				if ( on ) {
					tx.pushRetain( span );
					tx.pushStopAnnotating( method, annotation );
					span = 0;
					on = false;
				}
			} else {
				// Cover non-annotated content
				if ( !on ) {
					tx.pushRetain( span );
					tx.pushStartAnnotating( method, annotation );
					span = 0;
					on = true;
				}
			}
		}
		span++;
		i++;
	}
	tx.pushRetain( span );
	if ( on ) {
		tx.pushStopAnnotating( method, annotation );
	}
	tx.pushRetain( data.length - range.end );
	return tx;
};

/**
 * Generates a transaction that converts elements that can contain content.
 *
 * @static
 * @method
 * @param {ve.dm.Document} doc Document to create transaction for
 * @param {ve.Range} range Range to convert
 * @param {String} type Symbolic name of element type to convert to
 * @param {Object} attr Attributes to initialize element with
 * @returns {ve.dm.Transaction} Transaction that annotates content
 */
ve.dm.Transaction.newFromContentBranchConversion = function( doc, range, type, attr ) {
	var tx = new ve.dm.Transaction(),
		data = doc.getData(),
		selection = doc.selectNodes( range, 'leaves' ),
		opening = { 'type': type },
		closing = { 'type': '/' + type },
		previousBranch,
		previousBranchOuterRange;
	// Add attributes to opening if needed
	if ( ve.isPlainObject( attr ) ) {
		opening.attributes = attr;
	}
	// Replace the wrappings of each content branch in the range
	for ( var i = 0; i < selection.length; i++ ) {
		var selected = selection[i];
		if ( selected.node.isContent() ) {
			var branch = selected.node.getParent(),
				branchOuterRange = branch.getOuterRange();
			// Don't convert the same branch twice
			if ( branch === previousBranch ) {
				continue;
			}
			// Retain up to this branch, considering where the previous one left off
			tx.pushRetain(
				branchOuterRange.start - ( previousBranch ? previousBranchOuterRange.end : 0 )
			);
			// Replace the opening
			tx.pushReplace( [data[branchOuterRange.start]], [ve.copyObject( opening )] );
			// Retain the contents
			tx.pushRetain( branch.getLength() );
			// Replace the closing
			tx.pushReplace( [data[branchOuterRange.end - 1]], [ve.copyObject( closing )] );
			// Remember this branch and its range for next time
			previousBranch = branch;
			previousBranchOuterRange = branchOuterRange;
		}
	}
	// Retain until the end
	tx.pushRetain(
		data.length - ( previousBranch ? previousBranchOuterRange.end : 0 )
	);
	return tx;
};

/* Methods */

/**
 * Gets a list of all operations.
 *
 * @method
 * @returns {Object[]} List of operations
 */
ve.dm.Transaction.prototype.getOperations = function() {
	return this.operations;
};

/**
 * Gets the difference in content length this transaction will cause if applied.
 *
 * @method
 * @returns {Integer} Difference in content length
 */
ve.dm.Transaction.prototype.getLengthDifference = function() {
	return this.lengthDifference;
};

/**
 * Adds a retain operation.
 *
 * @method
 * @param {Integer} length Length of content data to retain
 * @throws 'Invalid retain length, can not retain backwards: {length}'
 */
ve.dm.Transaction.prototype.pushRetain = function( length ) {
	if ( length < 0 ) {
		throw 'Invalid retain length, can not retain backwards:' + length;
	}
	if ( length ) {
		var end = this.operations.length - 1;
		if ( this.operations.length && this.operations[end].type === 'retain' ) {
			this.operations[end].length += length;
		} else {
			this.operations.push( {
				'type': 'retain',
				'length': length
			} );
		}
	}
};

/**
 * Adds a replace operation
 *
 * @method
 * @param {Array} remove Data to remove
 * @param {Array] insert Data to replace 'remove' with
 */
ve.dm.Transaction.prototype.pushReplace = function( remove, insert ) {
	if ( remove.length === 0 && insert.length === 0 ) {
		// Don't push no-ops
		return;
	}
	this.operations.push( {
		'type': 'replace',
		'remove': remove,
		'insert': insert
	} );
	this.lengthDifference += insert.length - remove.length;
};

/**
 * Adds an element attribute change operation.
 *
 * @method
 * @param {String} key Name of attribute to change
 * @param {Mixed} from Value change attribute from
 * @param {Mixed} to Value to change attribute to
 */
ve.dm.Transaction.prototype.pushReplaceElementAttribute = function( key, from, to ) {
	this.operations.push( {
		'type': 'attribute',
		'key': key,
		'from': from,
		'to': to
	} );
};

/**
 * Adds a start annotating operation.
 *
 * @method
 * @param {String} method Method to use, either "set" or "clear"
 * @param {Object} annotation Annotation object to start setting or clearing from content data
 */
ve.dm.Transaction.prototype.pushStartAnnotating = function( method, annotation ) {
	this.operations.push( {
		'type': 'annotate',
		'method': method,
		'bias': 'start',
		'annotation': annotation
	} );
};

/**
 * Adds a stop annotating operation.
 *
 * @method
 * @param {String} method Method to use, either "set" or "clear"
 * @param {Object} annotation Annotation object to stop setting or clearing from content data
 */
ve.dm.Transaction.prototype.pushStopAnnotating = function( method, annotation ) {
	this.operations.push( {
		'type': 'annotate',
		'method': method,
		'bias': 'stop',
		'annotation': annotation
	} );
};
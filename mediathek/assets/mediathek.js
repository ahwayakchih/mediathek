/** 
*  MEDIATHEK for Symphony 2.0
*
*  author:		Nils Hörrmann
*  contact:		post@nilshoerrmann.de
*  website:		www.nilshoerrmann.de
*  version:		1.0
*  date:		05.01.2009
*/


/* 
   MOOTOOLS: change Drag.Move to respect offset
*/
 
Drag.Move.implement({
	checkAgainst: function(el){
		var scroll = el.getScrollSize();
		el = el.getCoordinates();
		if(scroll.y > el.bottom) {
			el.bottom = scroll.y;
		}
		var now = this.mouse.now;
		return (now.x > el.left && now.x < el.right && now.y < el.bottom && now.y > el.top);
	}
});


/* 
   MEDIATHEK: functions
*/

var MEDIATHEK = {

	/* init all needed functions */
	init: function() {
		$$('div.media').removeProperty('style');
		$$('label.media select').addClass('hidden');
		MEDIATHEK.close(0);
		MEDIATHEK.drag();
		MEDIATHEK.section();
		$('switch').addEvent('click', MEDIATHEK.toggle );
		$$('div.media ul li span').addEvent('click', function() {
			MEDIATHEK.select(this.getParent('li'), false);
		});
		$$('div.media ul li a').addEvent('click', MEDIATHEK.preview);
		$$('div.media a.create').addEvent('click', MEDIATHEK.create);
	},
	
	/* toggle: opens and closes mediathek */
	toggle: function() {
		if($('switch').get('text') == 'Show Selection') {
			MEDIATHEK.close('short');
		}
		else {
			MEDIATHEK.open();
		}
		this.blur();
		return false;
	},
	
	/* open: open mediathek */
	open: function() {
		// set status
		$$('div.media').removeClass('closed').addClass('open');	
		// get elements
		var el = $$('div.media ul li');
		var elUn = el.filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});
		// set events
		elUn.removeEvents('dblclick');
		// show unselected items
		$each(elUn, function(el) {
			var elSpan = el.getChildren('span');
			var valH = parseFloat(elSpan.getStyle('height'));
			var valP = parseFloat(elSpan.getStyle('padding-top'));
			var fxOpen = new Fx.Morph(el, {duration: 'short', transition: Fx.Transitions.Sine.easeOut});
			fxOpen.start({
				'height': valH + valP + valP,
				'border-width': '1'
			});
		});
		// change toggle text
		$('switch').set('text', 'Show Selection');
	},
	
	/* close: close mediathek */	
	close: function(time) {
		// set status
		$$('div.media').removeClass('open').addClass('closed');	
		// get elements		
		var elLi = $$('div.media ul li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true && item.getParent().getParent().match('div') ) return true;
		});
		var elSel = $$('div.media ul li').filter(function(item) {
			return item.getProperty('class').contains('active');
		});
		// hide unselected items
		MEDIATHEK.styles = {
			'overflow': 'hidden',
			'height': '0',
			'min-height': '0',
			'border-width': '0'
		};
		if(time != 0) {
			$each(elLi, function(el) {
				var fxClose = new Fx.Morph(el, {duration: time, transition: Fx.Transitions.Sine.easeOut});
				fxClose.start(MEDIATHEK.styles);
				el.getChildren('img').destroy();
			});
		}
		else {
			elLi.setStyles(MEDIATHEK.styles);
		}
		// set events and style list 
		$each(elSel, function(el, index) {
			el.getChildren('span').addEvent('dblclick', function() {
				var parent = this.getParent('li');
				var status = $$('div.media').getProperty('class');
				if(status[0].contains('closed') ) {
					MEDIATHEK.remove(parent);
				}
			});
			MEDIATHEK.zebra(el, index + 1);
		});
		// change toggle text
		if($$('div.media li.active').length == 0) {
			$('switch').set('text', 'Add Items form List');
		}
		else {
			$('switch').set('text', 'Change Selection');
		}
	},
	
	/* select: highlight selected items */
	select: function(el, remove) {
		var id = el.getChildren('a').getProperty('rel');
		var elO = $$('label.media select option'); 
		if(el.hasClass('active') || remove == true) {
 			$each(elO, function(option) { 
 				if(option.getProperty('value') == id) {
 					option.selected = '';
 				}
 			});
			el.removeClass('active');
		}
		else {
 			$each(elO, function(option) { 
 				if(option.getProperty('value') == id) {
 					option.selected = 'selected';
 				}
 			});
			el.addClass('active');		
		}
	},
	
	/* remove: unselect item with closed mediathek */
	remove: function(el) {
		el.setStyles(MEDIATHEK.styles);
		el.getChildren('img').destroy();
		el.removeClass('active');
		MEDIATHEK.select(el, true);
		// refresh zebra
		var elSel = $$('div.media ul li.active');
		$each(elSel, function(el, index) {
			MEDIATHEK.zebra(el, index + 1);
		});
		// change toggle text
		if($$('div.media li.active').length == 0) {
			$('switch').set('text', 'Add Items');
		}
	},
	
	/* drag: make list items draggable */	
	drag: function() {
		// get elements
		var elDrag = $$('div.media ul li');
		var elDrop = $$('textarea');
		// initialize drag
		elDrag.each(function(list){
			list.addEvent('mousedown', function(e) {
				e = new Event(e).stop();
				var elSpan = this.getChildren('span');
				var coordinates = this.getCoordinates();
				var elClone = new Element('a', {
					'class': 'drag',
					'href': this.getChildren('a').get('href'),
					'title': this.getChildren('span').get('text'),
					'html': elSpan.get('html'),
					'styles': {
						'background': '#232320',
						'border': '1px solid #2D2D2A',
						'position': 'absolute',
						'top': coordinates.top,
						'left': coordinates.left,
						'color': '#fff',
						'padding': '0.67em 6em 0.67em 1em',
						'width': elSpan.getStyle('width'),
						'cursor': 'move',
						'text-decoration': 'none',
						'z-index': '1000'
					},
					'events': {
						'click': function() {
							return false;
						}
					}
				});
				var elInfo = new Element('span', {
					'html': 'Drop Item',
					'styles': {
						'color': '#5273C0',
						'position': 'absolute',
						'top': '0.67em',
						'right': '1em'
					}
				}).fade('hide').inject(elClone);
		 		var drag = elClone.makeDraggable({
					overflown: [elDrop],
					droppables: elDrop,
					snap: 20,
					onDrag: function() {
						elClone.inject(document.body);
					},
					onEnter: function(element, droppable) {
						droppable.setStyle('background-color', '#F5F5F3');
						elClone.setStyle('color', '#F48435');
						elInfo.fade('show');
					},
					onLeave: function(element, droppable) {
						droppable.setStyle('background-color', 'transparent');
						elClone.setStyle('color', '#fff');
						elInfo.fade('hide');
					},
					onDrop: function(element, droppable) {
						if(droppable) {
							MEDIATHEK.insert(droppable, {
								title: element.get('title'),
								path: element.get('href')
							});
							droppable.setStyle('background-color', 'transparent');
							// add unselected item to selection after dropping it
/*
							if($$('div.media').hasClass('open')) {
								TO DO!
							}
*/
						}
						elClone.destroy();
					},
				});
		 		drag.start(e);
			});
		});	
	},
	
	/* insert: insert link or image in proper format */
	insert: function(el, value) {
		// get elements
		var text = MEDIATHEK.formatter(el, value);
		// get positions
		var start = el.selectionStart;
		var end = el.selectionEnd;
		// insert text
		if(start >= 0) {
			el.value = el.value.substring(0, start) + text + el.value.substring(end, el.value.length);
		}
		else {
			el.value += text;
		}
		// set cursor
		el.selectionStart = start;
		el.selectionEnd = start;
	},
	
	/* formatter: apply formatter */
	formatter: function(el, value) {
		var formatter;
		// different format for images and files
		if(MEDIATHEK.checkimage(value.path)) {
			formatter = {
				plain: '<img src="{path}" alt="{title}" />',
				markdown: '![{title}]({path})',
				textile: '!{path}({title})!'
			};
		}
		else {
			formatter = {
				plain: '<a href="{path}">{title}</a>',
				markdown: '[{title}]({path})',
				textile: '"{title}":{path}'			
			};
		}
		// select proper formatter
		if(el.get('class').contains('markdown') ) {
			return formatter.markdown.substitute(value);
		}
		if(el.get('class').contains('textile') ) {
			return formatter.textile.substitute(value);
		}
		else {
			return formatter.plain.substitute(value);		
		}
	},

	/* preview: inline preview of image */
	preview: function() {
		// get element
		var el = this.getParent('li');
		// get path
		var path = el.getChildren('a').get('href');
		path = path[0].replace(/workspace/, "image/2/40/40/5");
		// check if file is an image and show preview
		if(MEDIATHEK.checkimage(path)) {
			el.set('tween', {duration: 'short'});
			var image = new Element('img', {
				'src': path,
				'width': '50',
				'height': '50',
				'events': {
					'click': function(){
						this.destroy();
						el.tween('min-height', '0');
					}
				}
			});
			el.tween('min-height', '64px');
			image.inject(el);
			return false;
		}
		// don't preview other files (like txt, doc, pdf)
		return true;
	},
	
	/* checkimage: check if a file is an image (jpg, gif or png) */
	checkimage: function(path) {
		var type = path.substring(path.length - 4, path.length);
		if(type.contains('gif') || type.contains('jpg') || type.contains('jpeg') || type.contains('png') ) {
			return true;
		}
		else {
			return false;
		}
	},
	
	/* zebra: style list rows */
	zebra: function(el, index) {
		if(index % 2 == 0) {
			el.addClass('zebra');
		}
		else {
			el.removeClass('zebra');
		}
	},
	
	section: function() {
		var el = $$('div.media a.create').getLast();
		var elDiv = new Element('div', {
			'id': 'mediasection', 
			'class': 'start',
			'styles': {
				'height': '0',
				'overflow': 'hidden'			}
		});
		var elFrame = new IFrame({
			'id': 'section', 
			'name': 'mediasection', 
			'rel': 'start',
			'src': el.getProperty('href'),
			'onload': function(doc) {
				var frame = this;
				var el = $('mediasection');
				MEDIATHEK.frameheight = frame.getScrollSize().y;
				el.getChildren('iframe').setStyle('height', MEDIATHEK.frameheight);
				// hide frame on load
				frame.document.getElements('form').addEvent('submit', function() {
					el.getElement('iframe').fade('out');
				});
				if(el.getProperty('class') == 'start') {
					el.getElement('iframe').fade('in');
					el.erase('class');
				}
				else {
					// close upload after saving
					if(frame.location.href.contains('/edit/')) {
						el.setProperty('class', 'start');
						el.tween('height', '0');
						var title = frame.document.getElements('fieldset.primary label:nth-child(first) input').get('value');
						var path = frame.document.getElements('label.file a').getProperty('href');
						var rel = frame.location.href.match(/\d+/);
						var elSpan = new Element('span', {
							'text': title
						});
						var elStrong = new Element('strong', {
							'html': '&#160;*',
							'styles': {
								'color': '#F48435'
							}
						});
						var elA = new Element('a', {
							'rel': rel[rel.length - 1],
							'href': path,
							'text': 'Preview'
						});
						var elNew = new Element('li', {'class': 'active'});
						var elOpt = new Element('option', {
							'selected': 'selected',
							'value': rel[rel.length - 1],
							'text': title
						});
						elOpt.inject($$('label.media select').getLast(), 'bottom');
						elStrong.inject(elSpan, 'bottom');
						elSpan.inject(elNew, 'top');
						elA.inject(elNew, 'bottom');
						elNew.inject($$('div.media ul').getLast() );
						var elNotice = new Element('p', {
							'text': '* to approve selection:',
							'styles': {
								'color': '#F48435',
								'position': 'absolute',
								'right': '10em',
								'top': '1.3em'
							}
						});
						elNotice.inject($$('div.actions').getLast() );
						el.getChildren('iframe').setProperties({
							'src': $$('div.media a.create').getLast().getProperty('href'),
							'styles': {
								'height': 'auto'
							}
						});				
						MEDIATHEK.frameheight = frame.getScrollSize().y;
					}
					// adjust height
					else {
						el.getElement('iframe').fade('in');
						el.tween('height', MEDIATHEK.frameheight);
					}
				}
			} 
		});
		elFrame.inject(elDiv);
		elDiv.inject(el, 'after');
	},
	
	create: function() {
		var el = $('mediasection');
		var start = el.getStyle('height').toInt();
		if(start == 0) {
			el.tween('height', MEDIATHEK.frameheight);
		}
		else {
			el.tween('height', '0');
		}
		this.blur();
		return false;
	}
	
};


/*
   MEDIATHEK: start mediathek on domready
*/

window.addEvent('domready', function() {
	MEDIATHEK.init();
});
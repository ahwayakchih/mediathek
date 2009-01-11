/** 
*	MEDIATHEK for Symphony 2.0
*
*	author:		Nils Hörrmann
*	contact:	post@nilshoerrmann.de
*	website:	www.nilshoerrmann.de
*	version:	1.0
*	date:		January 2009
*/


/* 
   MOOTOOLS: Change Drag.Move to respect offset
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
   SELECTLIST: Advanced multiple select box
*/

var SelectList = new Class({

	Implements: [Events, Options],
	
	options: {
		rows: 10,
		listTemplate: '<span>{text}</span><a href="{path}" rel="{id}">Preview</a>',
		dragTemplate: '<a href="{path}" rel="{id}">{text}</a><span>Drop Item</span>',
		formatterTemplate: {
			image: {
				plain: '<img src="{path}" alt="{text}" />',
				markdown: '![{text}]({path})',
				textile: '!{path}({text})!'
			},
			document: {
				plain: '<a href="{path}">{text}</a>',
				markdown: '[{text}]({path})',
				textile: '"{text}":{path}'			
			}
		},
		hidden: {
			'overflow': 'hidden',
			'height': '0',
			'min-height': '0',
			'border-width': '0'
		}
	},
	
	select: null,

	mediathek: null,

	switcher: null,
	
	list: null,

	data: [],

	initialize: function(select, options) {

		sl = this;
		sl.select = $(select);
		sl.setOptions(options);
		
		// Setup the Mediathek
		sl.select.setStyle('display', 'none');
		sl.mediathek = new Element('div');
		sl.switcher = new Element('a');
		sl.list = new Element('ul');
		sl.getData();
		sl.populateList();
		sl.mediathek.appendChild(sl.switcher);
		sl.mediathek.appendChild(sl.list);
		sl.mediathek.inject(sl.select, 'after');
		var unselected = sl.list.getChildren('li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});
		sl.toggleItem(unselected, 'hide');
		sl.setBoxHeight();
		if(sl.list.getElements('li').length == 0) sl.switcher.fade('hide');
		sl.setLabel();

		// Events
		sl.select.addEvent('change', sl.onChange);
		sl.switcher.addEvent('click', sl.onToggle);
		sl.setEvents();
		
	},
	
	setEvents: function() {
	
		sl.list.getElements('li span').addEvent('dblclick', sl.onClick);	
		sl.list.getElements('li span').addEvent('click', sl.onClick);
		sl.list.getElements('li a').addEvent('click', sl.previewImage);
		sl.makeMovable(sl.list.getElements('li'));
	},
	
	
	onChange: function() {
	
		sl.list.empty();
		sl.getData();
		sl.populateList();
		if(sl.mediathek.hasClass('open')) {
			sl.setZebra(sl.list.getChildren('li'));
		}
		else {
			var unselected = sl.list.getChildren('li').filter(function(item) {
				if(item.getProperty('class').contains('active') != true) return true;
			});
			sl.toggleItem(unselected, 'hide');	
		}
		sl.setEvents();
		if(sl.list.getElements('li').length > 0) sl.switcher.fade('in');
		sl.setLabel();
	
	},
	
	onToggle: function() {
		
		var unselected = sl.list.getChildren('li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});
		sl.toggleItem(unselected);
		sl.mediathek.toggleClass('open');
		sl.setLabel();
			
	},
	
	onClick: function(event) {
		
		var item = this.getParent('li');
		if(event['type'] == 'click' && sl.mediathek.hasClass('open') ) {
			if(item.hasClass('active') ) {
				sl.toggleSelection(item, 'unselect')
			}
			else {
				sl.toggleSelection(item, 'select')
			}
			sl.setZebra(sl.list.getChildren('li'));
		}
		if(event['type'] == 'dblclick' && item.hasClass('active') && sl.mediathek.getAttribute('class') == '') {
			sl.toggleSelection(item, 'unselect')
			sl.toggleItem([item], 'unselect');
			sl.setZebra(sl.list.getChildren('li.active'));
		}
	
	},
	
	setLabel: function() {
	
		if(sl.mediathek.hasClass('open')) {
			sl.switcher.set('text', 'Show Selection Only (' + sl.list.getChildren('li.active').length.toInt() + ')');		
		}
		else {
			sl.switcher.set('text', 'Show All (' + sl.list.getChildren('li').length.toInt() + ')');	
		}

	},
	
	populateList: function() {

		sl.list.empty();
		sl.data.each(function(item) {
			var entry = new Element('li');
			entry.innerHTML = sl.options.listTemplate.substitute(item);
			if(item.selected) entry.addClass('active');
			sl.list.appendChild(entry);
		});

	},
	
	getData: function() {
	
		var count = 0;
		sl.select.getElements('option').each(function(option) {
			sl.data[count] = {
				text: option.label, 
				path: option.get('text'),
				id: option.value,
				selected: option.selected,
			};
			count++;
		});
		
	},
	
	setBoxHeight: function() {
	
		if(sl.list.getElements('li').length > 0) {
			var height = parseFloat(sl.list.getElement('li').getFirst().getStyle('height')) - 0.5;
			sl.list.setStyle('max-height', sl.options.rows * height * 2);
		}
		
	},
	
	toggleItem: function(items, mode) {
	
		items.each(function(item) {
			if(mode == 'hide') {
				items.setStyles(sl.options.hidden);
				sl.setZebra(sl.list.getChildren('li.active'));
			}
			else {
				var fxClose = new Fx.Morph(item, {duration: 'short', transition: Fx.Transitions.Sine.easeOut});
				if(sl.mediathek.hasClass('open') || mode == 'unselect') {
					fxClose.start(sl.options.hidden);
					item.getElements('img').destroy();
					sl.setZebra(sl.list.getChildren('li.active'));
				}
				else {
					var expanded = {
						'height': parseFloat(item.getChildren('span').getStyle('height') ) + (parseFloat(item.getChildren('span').getStyle('padding-top') ) * 2),
						'border-width': '1px'
					}
					fxClose.start(expanded);
					sl.setZebra(sl.list.getChildren('li'));
				}
			}
		});
		
	},
	
	toggleSelection: function(item, mode) {
	
		var id = item.getChildren('a').getLast().get('rel');
		if(mode == 'select') {
			item.addClass('active');
			sl.select.getChildren('option').filter(function(option) {
				if(option.get('value') == id) option.setProperty('selected', 'selected');
			});
		}
		else {
			item.removeClass('active');
			sl.select.getChildren('option').filter(function(option) {
				if(option.get('value') == id) option.removeProperty('selected');
			});
		}
		
	},
	
	setZebra: function(items) {
	
		var count = 1;
		items.each(function(item) {
			if(count % 2 == 0) item.addClass('zebra');
			else item.removeClass('zebra');
			count++;
		});

	},
	
	previewImage: function() {

		var parent = this.getParent('li');
		var path = this.get('href').replace(/workspace/, "image/2/65/65/5");
		if(sl.checkImage(path)) {
			parent.set('tween', {duration: 'short'});
			var image = new Element('img', {
				'src': path,
				'width': '65',
				'height': '65',
				'events': {
					'click': function() {
						this.destroy();
						parent.tween('min-height', '0');
					}
				}
			}).inject(parent);
			parent.tween('min-height', '87px');
			this.blur();
			return false;
		}

	},
	
	checkImage: function(path) {

		var type = path.substring(path.length - 4, path.length);
		if(type.contains('gif') || type.contains('jpg') || type.contains('jpeg') || type.contains('png') ) return true;
		else return false;

	},
	
	makeMovable: function(items) {

		items.each(function(item){
			item.addEvent('mousedown', function(event) {
				event = new Event(event).stop();
				var coordinates = this.getCoordinates();
				var data = {
					'path': this.getElement('a').get('href'),
					'id': this.getElement('a').get('rel'),
					'text': this.getElement('span').get('text'),
					'parent': sl.mediathek.getParent('label').childNodes[0].textContent
				};
				var clone = new Element('div', { 
					'class': 'drag',
					'html': sl.options.dragTemplate.substitute(data),
					'styles': {
						'top': coordinates.top,
						'left': coordinates.left,
						'width': this.getStyle('width')
					}
				});
		 		var drag = clone.makeDraggable({
					droppables: $$('textarea'),
					snap: 20,
					onDrag: function() {
						clone.inject(document.body);
					},
					onEnter: function(element, droppable) {
						droppable.setStyle('background-color', '#F5F5F3');
						clone.setStyle('color', '#F48435');
					},
					onLeave: function(element, droppable) {
						droppable.setStyle('background-color', 'transparent');
						clone.setStyle('color', '#555544');
					},
					onDrop: function(element, droppable) {
						if(droppable) {
							sl.insertText(droppable, data);
							droppable.setStyle('background-color', 'transparent');
							sl.toggleSelection(item, 'select');
						}
						clone.destroy();
					},
				});
		 		drag.start(event);
			});
		});	
	
	},
	
	insertText: function(textarea, data) {

		var text = sl.setFormat(textarea, data);
		var start = textarea.selectionStart;
		var end = textarea.selectionEnd;
		if(start >= 0) {
			textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end, textarea.value.length);
		}
		else {
			textarea.value += text;
		}
		textarea.selectionStart = start;
		textarea.selectionEnd = start;
		
	},
	
	setFormat: function(textarea, data) {

		var formatter;
		if(sl.checkImage(data.path)) formatter = sl.options.formatterTemplate.image;
		else formatter = sl.options.formatterTemplate.document;
		// Apply formatter
		if(textarea.get('class').contains('markdown')) return formatter.markdown.substitute(data);
		if(textarea.get('class').contains('textile')) return formatter.textile.substitute(data);
		return formatter.plain.substitute(data);

	}
	
});


/* 
   UPLOAD: Inline Upload
*/

var InlineUpload = new Class({

	Implements: [Events, Options],
	
	options: {},
	
	select: null,

	mediathek: null,
	
	create: null,
	
	mediasection: null,
	
	frame: null,
	
	section: null,

	initialize: function(select, options) {
	
		iu = this;
		iu.select = $(select);
		iu.setOptions(options);
		
		// Setup the Mediathek
		iu.mediathek = iu.select.getNext('div');
		iu.create = iu.select.getNext('a').addClass('create').inject(iu.mediathek.getElement('a'), 'after');
		iu.mediasection = new Element('div', {
			'id': 'mediasection', 
			'styles': {
				'height': '0',
				'overflow': 'hidden'
			}
		}).inject(iu.create, 'after');
		iu.frame = new IFrame({
			'id': 'section', 
			'name': 'mediasection', 
			'rel': 'start',
			'src': iu.create.getProperty('href') + '?mediathek=true',
			'onload': function(doc) {
				iu.section = this;
				iu.section.document.getElements('form').addEvent('submit', function() {
					iu.frame.fade('out');
				});
				iu.handleFrame();
			} 
		}).inject(iu.mediasection, 'top');
		
		// Events
		iu.create.addEvent('click', iu.onToggle);
		
	},
	
	onToggle: function() {
		
		if(iu.mediasection.getStyle('height').toInt() == 0) iu.mediasection.tween('height', iu.section.getScrollSize().y);
		else iu.mediasection.tween('height', '0');
		iu.mediasection.toggleClass('open');
		this.blur();
		return false;
		
	},
	
	resizeFrame: function() {
		
		var height = iu.section.getScrollSize().y;
		iu.frame.setStyle('height', height);
		if(iu.mediasection.hasClass('open')) iu.mediasection.tween('height', height);
		
	},
	
	handleFrame: function() {
	
		if(iu.section.location.href.contains('/edit/')) {
			// Entry saved
			var rel = iu.section.location.href.match(/\d+/);
			var newOption = new Element('option', {
				'selected': 'selected',
				'text': iu.section.document.getElements('label.file a').getProperty('href'),
				'label': iu.section.document.getElements('fieldset.primary label:nth-child(first) input').get('value'),
				'value': rel[rel.length - 1]
			}).inject(iu.select, 'bottom');
			iu.mediasection.tween('height', '0');
			iu.mediasection.removeClass('open');
			iu.section.location.href = iu.create.getProperty('href') + '?mediathek=true';
			iu.section.fireEvent('load', null, 1000);
			iu.select.fireEvent('change');
		}
		else {
			// No entry saved (start/error)
			iu.resizeFrame();
			iu.frame.fade('in');		
		}
	
	}
	
});


/*
	Initialize all components on domready
*/

window.addEvent('domready', function() {
	$$('label.media select').each(function(select) {
		new SelectList(select);
		new InlineUpload(select);
	});
});
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

		this.select = $(select);
		this.setOptions(options);
		
		// Setup the Mediathek
		this.select.setStyle('display', 'none');
		this.mediathek = new Element('div');
		this.switcher = new Element('a');
		this.list = new Element('ul');
		this.getData();
		this.populateList();
		this.mediathek.appendChild(this.switcher);
		this.mediathek.appendChild(this.list);
		this.mediathek.inject(this.select, 'after');
		var unselected = this.list.getChildren('li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});
		this.toggleItem(unselected, 'hide');
		this.setBoxHeight();
		if(this.list.getElements('li').length == 0) this.switcher.fade('hide');
		this.setLabel();

		// Events
		this.select.addEvent('change', this.onChange.bind(this));
		this.switcher.addEvent('click', this.onToggle.bind(this));
		this.setEvents();
		
	},
	
	setEvents: function() {
	
		this.list.getElements('li span').addEvent('dblclick', this.onClick.bind(this));	
		this.list.getElements('li span').addEvent('click', this.onClick.bind(this));
		this.list.getElements('li a').addEvent('click', this.previewImage.bind(this));
		this.makeMovable(this.list.getElements('li span'));
		
	},
	
	
	onChange: function() {
	
		this.list.empty();
		this.getData();
		this.populateList();
		if(this.mediathek.hasClass('open')) {
			this.setZebra(this.list.getChildren('li'));
		}
		else {
			var unselected = this.list.getChildren('li').filter(function(item) {
				if(item.getProperty('class').contains('active') != true) return true;
			});
			this.toggleItem(unselected, 'hide');	
		}
		this.setEvents();
		if(this.list.getElements('li').length > 0) this.switcher.fade('in');
		this.setLabel();
	
	},
	
	onToggle: function() {
		
		var unselected = this.list.getChildren('li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});
		this.toggleItem(unselected);
		this.mediathek.toggleClass('open');
		this.setLabel();
			
	},
	
	onClick: function(event) {
		
		var item = event.target.getParent('li');
		if(event['type'] == 'click' && this.mediathek.hasClass('open') ) {
			if(item.hasClass('active') ) {
				this.toggleSelection(item, 'unselect')
			}
			else {
				this.toggleSelection(item, 'select')
			}
			this.setZebra(this.list.getChildren('li'));
		}
		if(event['type'] == 'dblclick' && item.hasClass('active') && this.mediathek.getAttribute('class') == '') {
			this.toggleSelection(item, 'unselect')
			this.toggleItem([item], 'unselect');
			this.setZebra(this.list.getChildren('li.active'));
		}
	
	},
	
	setLabel: function() {
	
		if(this.mediathek.hasClass('open')) {
			this.switcher.set('text', 'Show Selection Only (' + this.list.getChildren('li.active').length.toInt() + ')');		
		}
		else {
			this.switcher.set('text', 'Show All (' + this.list.getChildren('li').length.toInt() + ')');	
		}

	},
	
	populateList: function() {

		this.list.empty();
		this.data.each(function(item) {
			var entry = new Element('li');
			entry.innerHTML = this.options.listTemplate.substitute(item);
			if(item.selected) entry.addClass('active');
			this.list.appendChild(entry);
		}.bind(this));

	},
	
	getData: function() {
	
		var count = 0;
		this.select.getElements('option').each(function(option) {
			this.data[count] = {
				text: option.label, 
				path: option.get('text'),
				id: option.value,
				selected: option.selected,
			};
			count++;
		}.bind(this));
		
	},
	
	setBoxHeight: function() {
	
		if(this.list.getElements('li').length > 0) {
			var height = parseFloat(this.list.getElement('li').getFirst().getStyle('height')) - 0.5;
			this.list.setStyle('max-height', this.options.rows * height * 2);
		}
		
	},
	
	toggleItem: function(items, mode) {
	
		items.each(function(item) {
			if(mode == 'hide') {
				items.setStyles(this.options.hidden);
				this.setZebra(this.list.getChildren('li.active'));
			}
			else {
				var fxClose = new Fx.Morph(item, {duration: 'short', transition: Fx.Transitions.Sine.easeOut});
				if(this.mediathek.hasClass('open') || mode == 'unselect') {
					fxClose.start(this.options.hidden);
					item.getElements('img').destroy();
					this.setZebra(this.list.getChildren('li.active'));
				}
				else {
					var expanded = {
						'height': parseFloat(item.getChildren('span').getStyle('height') ) + (parseFloat(item.getChildren('span').getStyle('padding-top') ) * 2),
						'border-width': '1px'
					}
					fxClose.start(expanded);
					this.setZebra(this.list.getChildren('li'));
				}
			}
		}.bind(this));
		
	},
	
	toggleSelection: function(item, mode) {
	
		var id = item.getChildren('a').getLast().get('rel');
		if(mode == 'select') {
			item.addClass('active');
			this.select.getChildren('option').filter(function(option) {
				if(option.get('value') == id) option.setProperty('selected', 'selected');
			});
		}
		else {
			item.removeClass('active');
			this.select.getChildren('option').filter(function(option) {
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
	
	previewImage: function(event) {

		var parent = event.target.getParent('li');
		var path = event.target.get('href').replace(/workspace/, "image/2/65/65/5");
		if(this.checkImage(path)) {
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
			event.target.blur();
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
				var coordinates = event.target.getCoordinates();
				var data = {
					'path': event.target.getNext('a').get('href'),
					'id': event.target.getNext('a').get('rel'),
					'text': event.target.get('text'),
					'parent': this.mediathek.getParent('label').childNodes[0].textContent
				};
				var clone = new Element('div', { 
					'class': 'drag',
					'html': this.options.dragTemplate.substitute(data),
					'styles': {
						'top': coordinates.top,
						'left': coordinates.left,
						'width': event.target.getParent('li').getStyle('width')
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
							this.insertText(droppable, data);
							droppable.setStyle('background-color', 'transparent');
							this.toggleSelection(item.getParent('li'), 'select');
						}
						clone.destroy();
					}.bind(this),
				});
		 		drag.start(event);
			}.bind(this));
		}.bind(this));	
	
	},
	
	insertText: function(textarea, data) {

		var text = this.setFormat(textarea, data);
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
		if(this.checkImage(data.path)) formatter = this.options.formatterTemplate.image;
		else formatter = this.options.formatterTemplate.document;
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
	
	label: null,

	mediathek: null,
	
	create: null,
	
	mediasection: null,
	
	frame: null,
	
	section: null,

	initialize: function(select, options) {
	
		this.select = $(select);
		this.setOptions(options);
	
		// Setup the Mediathek
		this.label = this.select.getParent('label').firstChild.data.clean().camelCase();
		this.mediathek = this.select.getNext('div');
		this.create = this.select.getNext('a').addClass('create').inject(this.mediathek.getElement('a'), 'after');
		this.mediasection = new Element('div', {
			'class': 'mediasection',
			'styles': {
				'height': '0',
				'overflow': 'hidden'
			}
		}).inject(this.create, 'after');
		this.frame = new IFrame({
			'id': this.label + 'Frame',
			'class': 'section',
			'rel': 'start',
			'src': this.create.getProperty('href') + '?mediathek=true',
			'onload': function(doc) {
				this.section = doc;
				this.section.getElements('form').addEvent('submit', function() {
					this.frame.fade('out');
				}.bind(this));
				this.handleFrame();
			}.bind(this)
		}).inject(this.mediasection, 'top');
		
		// Events
		this.create.addEvent('click', this.onToggle.bind(this));
		
	},
	
	onToggle: function() {
	
		if(this.mediasection.getStyle('height').toInt() == 0) this.mediasection.tween('height', this.section.getScrollSize().y);
		else this.mediasection.tween('height', '0');
		this.mediasection.toggleClass('open');
		this.create.blur();
		return false;
		
	},
	
	resizeFrame: function() {
		
		var height = this.section.getScrollSize().y;
		this.frame.setStyle('height', height);
		if(this.mediasection.hasClass('open')) this.mediasection.tween('height', height);
		
	},
	
	handleFrame: function() {

		if(this.section.location.href.contains('/edit/')) {
			// Entry saved
			var rel = this.section.location.href.match(/\d+/);
			var newOption = new Element('option', {
				'selected': 'selected',
				'text': this.section.document.getElements('label.file a').getProperty('href'),
				'label': this.section.document.getElements('fieldset.primary label:nth-child(first) input').get('value'),
				'value': rel[rel.length - 1]
			}).inject(this.select, 'bottom');
			this.mediasection.tween('height', '0');
			this.mediasection.removeClass('open');
			this.section.location.href = this.create.getProperty('href') + '?mediathek=true';
			this.section.fireEvent('load', null, 1000);
			this.select.fireEvent('change');
		}
		else {
			// No entry saved (start/error)
			this.resizeFrame();
			this.frame.fade('in');		
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
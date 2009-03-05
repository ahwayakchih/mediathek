/** 
*	MEDIATHEK for Symphony 2.0
*
*	author:		Nils Hörrmann
*	contact:	post@nilshoerrmann.de
*	website:	www.nilshoerrmann.de
*	version:	1.1
*	date:		February 2009
*	licence:	MIT, see licence file
*
*	The autocomplete feature is based on Kyle Neath's select_autocompleter.js, released under MIT license
*	http://warpspire.com/tipsresources/interface-scripting/select-autocompleter/
*	http://github.com/kneath/select-autocompleter/tree/master
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
		cutoffScore: 0.1,
		rows: 10,
		templates: {
			list: '<span>{text}</span><a rel="{id}" href="{path}">{preview}</a>',
			drag: '<a href="{path}" rel="{id}">{text}</a><span>{drop}</span>',
			formatter: {
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
			}
		},
		hidden: {
			'overflow': 'hidden',
			'height': '0',
			'min-height': '0',
			'border-width': '0',
			'opacity': '1'
		},
		language: {
			all: 'Show All',
			selected: 'Show Selected',
			preview: 'Preview',
			drop: 'Drop Item'
		},
		switcherWidth: {}
	},
		
	select: null,

	mediathek: null,

	switcher: null,
	
	input: null,
	
	list: null,

	data: [],
	
	results: [],

	terms: [],
	
	filteredTerms: [],
	
	filter: {},

	initialize: function(select, options) {

		this.select = $(select);
		this.setOptions(options);
		
		this.select.setStyle('display', 'none');
		this.mediathek = this.select.getParent('label').getNext('div.media');
		this.mediathek.setStyle('display', 'block');
		this.switcher = this.mediathek.getChildren('div.actions')[0].getElement('a');
		this.input = this.mediathek.getChildren('div.actions')[0].getElement('input');
		this.list = this.mediathek.getElement('ul');

		this.options.switcherWidth = this.switcher.getStyle('width').toInt() + 22;
		this.options.language.all = this.switcher.get('text').split('|')[1];
		this.options.language.selected = this.switcher.get('text').split('|')[0];
		this.options.language.preview = this.list.getChildren('li')[0].get('text');
		this.options.language.drop = this.list.getChildren('li')[1].get('text');

		this.input.getParent('p').setStyle('padding-left', this.options.switcherWidth);
		this.input.fade('hide');
		this.getData();
		this.populateList();
		var unselected = this.list.getChildren('li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});
		this.toggleItem(unselected, 'hide');
		this.setBoxHeight();
		if(this.list.getElements('li').length == 0) this.switcher.setStyle('text-indent', '-1000em');
		this.setLabel();
		
		this.list.getElements('a').each(function(item) {
			if(this.checkImage(item.getProperty('href'))) item.addClass('image');
		}.bind(this));
		
		// Events
		this.select.addEvent('change', this.onChange.bind(this));
		this.switcher.addEvent('click', this.onToggle.bind(this));
		this.input.getNext('a').addEvent('click', this.onToggleSearch.bind(this));
		this.input.addEvent('keyup', this.keyListener.bind(this));
		
	},

	setEvents: function() {
	
		this.list.getElements('li span').addEvent('dblclick', this.onClick.bind(this));	
		this.list.getElements('li span').addEvent('click', this.onClick.bind(this));
		this.list.getElements('li a').addEvent('click', this.previewImage.bind(this));
		this.makeMovable(this.list.getElements('li span'));
		
	},
	
	onChange: function(animate) {
	
		if(animate == true) {
			this.list.fade('hide');
			this.getData();
			this.populateList();
			this.toggleItem(this.list.getChildren('li'), 'hide');
			this.list.fade('show');
		}
		else {
			this.getData();
			this.populateList();
		}
		
		if(this.mediathek.hasClass('open')) {
			this.setZebra(this.list.getChildren('li'));
			if(animate == true) this.toggleItem(this.list.getChildren('li'), 'show');
		}
		else {
			var unselected = this.list.getChildren('li').filter(function(item) {
				if(item.getProperty('class').contains('active') != true) return true;
			});
			this.toggleItem(unselected, 'hide');	
			if(animate == true) this.toggleItem(this.list.getChildren('li.active'), 'show');
		}
		
		if(this.list.getElements('li').length > 0) this.switcher.setStyle('text-indent', '0');
		this.setLabel();
	
	},
	
	onToggle: function() {
	
		if(this.input.getStyle('opacity') != 0) {
			this.input.fade('out');
			this.input.getNext('a').removeClass('active');
			this.getData();
			this.populateList();
		}

		var unselected = this.list.getChildren('li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});	
		this.toggleItem(unselected);
		this.mediathek.toggleClass('open');
		this.setLabel();
		
		if(this.input.getStyle('opacity') != 0) {
			this.input.fade('toggle');
			this.input.getNext('a').removeClass('active');	
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
				if((this.mediathek.hasClass('open') && mode != 'show') || mode == 'fade') {
					fxClose.start(this.options.hidden);
					item.getElements('img').destroy();
					this.setZebra(this.list.getChildren('li.active'));
				}
				else {
					var expanded = {
						'height': parseFloat(item.getChildren('span').getStyle('height') ) + (parseFloat(item.getChildren('span').getStyle('padding-top') ) * 2),
						'border-width': '1px',
						'opacity' : '1'
					}
					fxClose.start(expanded);
					this.setZebra(this.list.getChildren('li'));
				}
			}
		}.bind(this));
		
	},
		
	onToggleSearch: function() {
	
		if(this.input.hasClass('open')) this.closeSearch();
		else this.openSearch();
		
	},
	
	openSearch: function() {
	
		this.input.addClass('open');
		this.input.value = '';
		if(this.mediathek.hasClass('open') == false) {
			this.toggleItem(this.list.getChildren('li'), 'active');
			this.mediathek.addClass('open');
			this.setLabel();			
		}
		this.input.fade('toggle');
		this.input.getNext('a').toggleClass('active');
		setTimeout(function(){this.input.focus()}.bind(this), 100);
		this.input.fireEvent('load');

	},
	
	closeSearch: function() {

		this.input.removeClass('open');
		this.input.fade('toggle');
		this.input.getNext('a').removeClass('active');
		this.getData();
		this.populateList();
		var unselected = this.list.getChildren('li').filter(function(item) {
			if(item.getProperty('class').contains('active') != true) return true;
		});	
		this.toggleItem(unselected, 'unselect');
		this.mediathek.removeClass('open');
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
		if(event['type'] == 'dblclick' && item.hasClass('active') && this.mediathek.hasClass('open') == false) {
			this.toggleSelection(item, 'unselect')
			this.toggleItem([item], 'fade');
			this.setZebra(this.list.getChildren('li.active'));
		}
	
	},
	
	getData: function() {
	
		var count = 0;
		this.terms.empty();
		this.select.getElements('option').each(function(option) {
			if(option.get('text') != '' && option.label != '') {
				this.data[count] = {
					text: option.label, 
					path: option.get('text'),
					id: option.value,
					preview: this.options.language.preview,
					selected: option.selected,
				};
				this.terms.push(option.label);
				count++;
			}
		}.bind(this));

	},

	populateList: function() {

		this.list.empty();
		this.data.each(function(item) {
			var entry = new Element('li');
			entry.innerHTML = this.options.templates.list.substitute(item);
			if(item.selected) entry.addClass('active');
			entry.inject(this.list);
		}.bind(this));
		this.setEvents();

	},
	
	setBoxHeight: function() {
	
		if(this.list.getElements('li').length > 0) {
			var height = parseFloat(this.list.getElement('li').getFirst().getStyle('height')) - 0.5;
			this.list.setStyle('max-height', this.options.rows * height * 2);
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
	
	setLabel: function() {
	
		if(this.mediathek.hasClass('open')) {
			this.switcher.set('text', this.options.language.selected);
		}
		else {
			this.switcher.set('text', this.options.language.all);
		}

	},
	
	toggleSelection: function(item, mode) {
	
		var id = item.getChildren('a').getLast().get('rel');
		if(mode == 'select') {
			if(this.select.getAttribute('multiple') != 'multiple') {
				this.list.getChildren('li').removeClass('active');
				this.select.getChildren('option').removeProperty('selected');
			}
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
	
	
	previewImage: function(event) {

		var parent = event.target.getParent('li');
		var path = event.target.get('href').replace(/workspace/, "image/2/65/65/5");
		if(this.checkImage(path)) {
			event.target.fade('out');
			parent.set('tween', {duration: 'short'});
			var image = new Element('img', {
				'src': path,
				'width': '65',
				'height': '65',
				'events': {
					'click': function() {
						this.destroy();
						parent.tween('min-height', '0');
						event.target.fade('in');
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
					'parent': this.select.getParent('label').childNodes[0].textContent,
					'drop': this.options.language.drop
				};
				var clone = new Element('div', { 
					'class': 'drag',
					'html': this.options.templates.drag.substitute(data),
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
						droppable.setStyles({
							'background-color': '#F5F5F3',
							'color': '#000000'
						});
						clone.setStyle('color', '#F48435');
					},
					onLeave: function(element, droppable) {
						droppable.erase('style');
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
		if(this.checkImage(data.path)) formatter = this.options.templates.formatter.image;
		else formatter = this.options.templates.formatter.document;
		// Apply formatter
		if(textarea.get('class').contains('markdown')) return formatter.markdown.substitute(data);
		if(textarea.get('class').contains('textile')) return formatter.textile.substitute(data);
		return formatter.plain.substitute(data);

	},
	
	keyListener: function(event) {

		if(event.key == "esc") {
			this.onToggleSearch();
		} 
		else if (event.key == "return" || event.key == "enter") {
			event.stop();
		}
		else {
			this.updateTermsList();
		}
		
	},
	
	updateTermsList: function(){
	
		var filterValue = this.input.get('value');
		this.buildFilteredTerms(filterValue);
		
		var letters = []
		for(var i=0; i<filterValue.length; i++) {
			var letter = filterValue.substr(i, 1);
			if (!letters.contains(letter)) letters.push(letter);
		}

		this.list.empty();
		this.filteredTerms.each(function(scoredTerm) {
			
			// Build the regular expression for highlighting matching terms
			var regExpString = ""
			letters.each(function(letter) {
				regExpString += letter;
			});
			
			// Build a formatted string highlighting matches with <strong>
			var formattedString = scoredTerm[1];
			if (filterValue.length > 0) {
				var regexp = new RegExp("([" + regExpString + "])", "ig");
				formattedString = formattedString.replace(regexp, "<strong>$1</strong>");
			}
			
			// Build the template
			this.filter = {
				plain: scoredTerm[1],
				formatted: formattedString
			}
			this.data.each(function(item) {
				if(item.text == this.filter.plain) {
					var result = {
						text: this.filter.formatted, 
						path: item.path,
						id: item.id,
						preview: this.options.language.preview,
						selected: item.selected,
					};
					var entry = new Element('li');
					entry.innerHTML = this.options.templates.list.substitute(result);
					if(result.selected) entry.addClass('active');
					entry.inject(this.list);
				}
			}.bind(this));
						
		}, this);
		
		this.setEvents();
		
	},
	
	buildFilteredTerms: function(filter) {

		this.filteredTerms = [];
		
		this.terms.each(function(term) {
			var score = term.toLowerCase().score(filter.toLowerCase())
			if (score < this.options.cutoffScore) return;
			this.filteredTerms.push([score, term]);
		}, this);
		
		this.filteredTerms.sort(function(a, b) { return b[0] - a[0]; });
		
	}
	
});


/* 
	UPLOAD: Inline Upload
*/

SelectList.implement({

	create: null,
	
	mediasection: null,
	
	frame: null,
	
	section: null,
	
	initialize: function(select, options) {
	
		this.parent(select, options);

		// Setup Inline Upload
		this.label = this.select.getParent('label').firstChild.data.clean().camelCase();
		this.create = this.mediathek.getElement('a.create');
		this.mediasection = new Element('div', {
			'class': 'mediasection',
			'styles': {
				'height': '0',
				'overflow': 'hidden'
			}
		}).inject(this.mediathek.getElement('div.actions'), 'after');
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
		this.create.addEvent('click', this.onToggleCreate.bind(this));
		this.input.addEvent('load', this.closeCreate.bind(this));
		
	},
	
	onToggleCreate: function() {
	
		if(this.mediasection.getStyle('height').toInt() == 0) this.openCreate();
		else this.closeCreate();
		this.create.blur();
		return false;
		
	},
	
	openCreate: function() {

		this.create.addClass('open');
		if(this.input.hasClass('open')) this.closeSearch();
		this.mediasection.tween('height', this.section.getScrollSize().y);
		this.mediasection.addClass('open');

	},
	
	closeCreate: function() {

		this.create.removeClass('open');
		this.mediasection.tween('height', '0');
		this.mediasection.removeClass('open');

	},
	
	resizeFrame: function() {
		
		var height = this.section.getScrollSize().y;
		this.frame.setStyle('height', height);
		if(this.mediasection.hasClass('open')) this.mediasection.tween('height', height);
		
	},
	
	handleFrame: function() {

		if(this.section.location.href.contains('/edit/')) {
			// Entry saved
			rel = this.section.location.href.match(/\d+/g);
			var newOption = new Element('option', {
				'selected': 'selected',
				'text': this.section.window.document.getElements('label.file a').getProperty('href'),
				'label': this.section.window.document.getElements('fieldset.primary label input')[0].get('value'),
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
	});
});
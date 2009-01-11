<?php
	
	Class fieldMediathek extends Field {
	
	
	/**
	 *	FIELD SETTINGS
	 */

		function __construct(&$parent){
			parent::__construct($parent);
			$this->_name = 'Mediathek';
			$this->set('show_column', 'no');			
		}

		function canToggle(){
			return true;
		}

		function canFilter(){
			return true;
		}
		
		function canPrePopulate(){
			return true;
		}			
		
		function allowDatasourceOutputGrouping(){
			return false;
		}
		
		function allowDatasourceParamOutput(){
			return true;
		}	
		

	/**
	 *	INTERFACE
	 */
		
		// Section Settings
						
		function displaySettingsPanel(&$wrapper, $errors=NULL){		
			
			parent::displaySettingsPanel($wrapper, $errors);

			$div = new XMLElement('div', NULL, array('class' => 'group'));
						
			$label = Widget::Label(__('Connected Upload Field'));
			
			$sectionManager = new SectionManager($this->_engine);
		    $sections = $sectionManager->fetch(NULL, 'ASC', 'name');		    
		    
			$field_groups = array();
			
			if(is_array($sections) && !empty($sections))
				foreach($sections as $section) 
					$field_groups[$section->get('id')] = array('fields' => $section->fetchFields(), 'section' => $section);

			$options = array(
				array('', false, __('None Selected')),
			);
			
			foreach($field_groups as $group){
				
				if(!is_array($group['fields'])) continue;
				
				$fields = array();
				foreach($group['fields'] as $f){
					if($f->get('id') != $this->get('id') && $f->get('type') == 'upload') $fields[] = array($f->get('id'), ($this->get('related_field_id') == $f->get('id')), $f->get('label'));
				}
		    
				if(is_array($fields) && !empty($fields)) $options[] = array('label' => $group['section']->get('name'), 'options' => $fields);
			}
			
			$label->appendChild(Widget::Select('fields['.$this->get('sortorder').'][related_field_id]', $options));
			$div->appendChild($label);
						
			if(isset($errors['related_field_id'])) $wrapper->appendChild(Widget::wrapFormElementWithError($div, $errors['related_field_id']));
			else $wrapper->appendChild($div);
			
			$this->appendShowColumnCheckbox($wrapper);
						
		}

		function commit(){
			
			if(!parent::commit()) return false;
			
			$id = $this->get('id');			
			
			if($id === false) return false;
			
			$fields = array();
			
			$fields['field_id'] = $id;
			if($this->get('related_field_id') != '') $fields['related_field_id'] = $this->get('related_field_id');

			$this->Database->query("DELETE FROM `tbl_fields_".$this->handle()."` WHERE `field_id` = '$id' LIMIT 1");
			
			if(!$this->Database->insert($fields, 'tbl_fields_' . $this->handle())) return false;
			
			return true;
					
		}
		
		function checkFields(&$errors, $checkForDuplicates=true){
			
			if(!is_array($errors)) $errors = array();
			
			if($this->get('related_field_id') == '' || $this->get('related_field_id') == 'none') 
				$errors['related_field_id'] = __('A file upload field must be selected.');

			parent::checkFields($errors, $checkForDuplicates);
			
		}

		// Publish Entry (New, Edit)

		function displayPublishPanel(&$wrapper, $data=NULL, $flagWithError=NULL, $fieldnamePrefix=NULL, $fieldnamePostfix=NULL){

			$this->_engine->Page->addScriptToHead(URL . '/extensions/mediathek/lib/mootools-1.2.1-core.js', 100);
			$this->_engine->Page->addScriptToHead(URL . '/extensions/mediathek/lib/mootools-1.2-more.js', 105);
			$this->_engine->Page->addScriptToHead(URL . '/extensions/mediathek/assets/mediathek.js', 110);
			$this->_engine->Page->addStylesheetToHead(URL . '/extensions/mediathek/assets/mediathek.css', 'screen', 115);

			$states = $this->findOptions();
			$options = array();
			
			if(!is_array($data['relation_id'])) $data['relation_id'] = array($data['relation_id']);

			$entry_ids = $data['relation_id'];
			foreach($states as $id){
				$options[] = array($id['id'], in_array($id['id'], $entry_ids), URL . '/workspace' . $id['file'], NULL, NULL, array('label' => $id['title']) );
			}
					
			$fieldname = 'fields'.$fieldnamePrefix.'['.$this->get('element_name').']'.$fieldnamePostfix;
			$fieldname .= '[]';
			
			$label = Widget::Label($this->get('label'), NULL, 'media');
			$label->appendChild(Widget::Select($fieldname, $options, array('multiple' => 'multiple', 'class' => 'source') ));
			$label->appendChild($this->createInlineUpload() );
			
			if($flagWithError != NULL) $wrapper->appendChild(Widget::wrapFormElementWithError($label, $flagWithError));
			else $wrapper->appendChild($label);		
		
		}
		
		function findOptions($id){

			$values = array();
			
			// get title id
			$title = $this->Database->fetch(	
				"SELECT t2.`id` 
				FROM  `tbl_fields` AS t1
				INNER JOIN  `tbl_fields` AS t2
				WHERE t1.`id` =  '".$this->get('related_field_id')."'
				AND t1.`parent_section` = t2.`parent_section` 
				AND t2.`sortorder` =  '0'
				LIMIT 1"		
			);

			// get titles and files
			$sql = "SELECT t1.`entry_id` , t1.`file` , t2.`value` 
				FROM  `sym_entries_data_".$this->get('related_field_id')."` AS t1
				INNER JOIN  `sym_entries_data_".$title[0]['id']."` AS t2
				WHERE t1.`entry_id` = t2.`entry_id` 
				LIMIT 0 , 300";
			
			// options array
			if($results = $this->Database->fetch($sql)){
				foreach($results as $result){
					$values[$result['entry_id']]['id'] = $result['entry_id'];				
					$values[$result['entry_id']]['file'] = $result['file'];				
					$values[$result['entry_id']]['title'] = $result['value'];				
				}
			}

			return $values;

		}		
		
		function createInlineUpload() {
			$linked_section = $this->Database->fetch(
				"SELECT t1.`handle`
				FROM  `sym_sections` AS t1
				INNER JOIN  `sym_fields` AS t2
				WHERE t2.`id` = '".$this->get('related_field_id')."' 
				AND t1.`id` = t2.`parent_section`
				LIMIT 1"
			);	
			$new = new XMLElement('a', __('Create New'), array(
				'title' => 'Create new entry in related section',
				'href' => URL . '/symphony/publish/' . $linked_section[0]['handle'] . '/new/'
			));
			return $new;
		}

		function processRawFieldData($data, &$status, $simulate=false, $entry_id=NULL){

			$status = self::__OK__;
						
			if(!is_array($data)) return array('relation_id' => $data);

			if(empty($data)) return NULL;
		
			$result = array();

			foreach($data as $a => $value) { 
			  $result['relation_id'][] = $data[$a];
			}
	
			return $result;

		}
		
		// section index table

		function prepareTableValue($data, XMLElement $link=NULL){

			$count = count($data['relation_id']);
			if($count > 0) {
				return $count;				
			}

		}
		
		// data source filter panel

		function displayDatasourceFilterPanel(&$wrapper, $data=NULL, $errors=NULL, $fieldnamePrefix=NULL, $fieldnamePostfix=NULL){
			
			parent::displayDatasourceFilterPanel($wrapper, $data, $errors, $fieldnamePrefix, $fieldnamePostfix);
			$text = new XMLElement('p', __('Use comma separated entry ids for filtering.'), array('class' => 'help') );
			$wrapper->appendChild($text);
			
		}


	/**
	 *	DATA SOURCES
	 */

		public function appendFormattedElement(&$wrapper, $data, $encode = false) {
			if(!is_array($data) or empty($data)) return;
			if(!is_array($data['relation_id'])) $data['relation_id'] = array($data['relation_id']);
			
			$id = $this->_engine->Database->fetchRow(0,"SELECT `parent_section` FROM  `sym_fields` WHERE  `id` = '".$this->get('related_field_id')."' LIMIT 1");			
			$section = $this->_engine->Database->fetchRow(0, "SELECT `id`, `handle` FROM `tbl_sections` WHERE `id` = '".$id['parent_section']."' LIMIT 1");			
			
			$list = new XMLElement($this->get('element_name'), NULL, array(
				'count' => count($data['relation_id']),
				'related-section-handle' => $section['handle'],
				'related-section-id' => $section['id']
			));
			
			foreach ($data['relation_id'] as $index => $value) {
				$list->appendChild(new XMLElement(
					'item', $data['relation_id'][$index], array(
						'id'	 => $data['relation_id'][$index],
					)
				));
			}

			$wrapper->appendChild($list);
		}

		public function getParameterPoolValue($data){
			if(is_array($data['relation_id'])) return implode(", ", $data['relation_id']);
			return $data['relation_id'];
		}		

		function buildDSRetrivalSQL($data, &$joins, &$where, $andOperation=false){

			$field_id = $this->get('id');

			if($andOperation):

				foreach($data as $key => $bit){
					$joins .= " LEFT JOIN `tbl_entries_data_$field_id` AS `t$field_id$key` ON (`e`.`id` = `t$field_id$key`.entry_id) ";
					$where .= " AND `t$field_id$key`.relation_id = '$bit' ";
				}

			else:

				$joins .= " LEFT JOIN `tbl_entries_data_$field_id` AS `t$field_id` ON (`e`.`id` = `t$field_id`.entry_id) ";
				$where .= " AND `t$field_id`.relation_id IN ('".@implode("', '", $data)."') ";

			endif;

			return true;

		}


	/**
	 *	EVENTS
	 */

		public function getExampleFormMarkup(){
			return Widget::Select('fields['.$this->get('element_name').']', array(array('...')) );
		}			
		
		
	/**
	 *	DATABASE
	 */

		function createTable(){

			return $this->_engine->Database->query(

				"CREATE TABLE IF NOT EXISTS `tbl_entries_data_" . $this->get('id') . "` (
				`id` int(11) unsigned NOT NULL auto_increment,
				`entry_id` int(11) unsigned NOT NULL,
				`relation_id` int(11) unsigned NOT NULL,
				PRIMARY KEY  (`id`),
				KEY `entry_id` (`entry_id`),
				KEY `relation_id` (`relation_id`)
				) TYPE=MyISAM;"

			);
		}

	}
<?php
	
	Class fieldMediathek extends Field {
	
		public $ext_mediathek, $ext_mootools, $ext_mootools_drag, $ext_quicksilver;
	
	/**
	 *	FIELD SETTINGS
	 */

		function __construct(&$parent){
			parent::__construct($parent);
			$this->_name = __('Mediathek');
			$this->set('show_column', 'no');			
		}

		function canToggle(){
			return ($this->get('allow_multiple_selection') == 'yes' ? false : true);
		}
		
		function canFilter(){
			return true;
		}
		
		function canPrePopulate(){
			return true;
		}			
		
		function allowDatasourceOutputGrouping(){
			return $this->canToggle();
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
						
			$label = Widget::Label(__('Connected Upload Field'));
			
			$sectionManager = new SectionManager($this->_engine);
		    $sections = $sectionManager->fetch(NULL, 'ASC', 'name');		    
		    
			$field_groups = array();
			
			if(is_array($sections) && !empty($sections)) {
				foreach($sections as $section) {
					$field_groups[$section->get('id')] = array('fields' => $section->fetchFields(), 'section' => $section);
				}
			}

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
			if(isset($errors['related_field_id'])) $wrapper->appendChild(Widget::wrapFormElementWithError($label, $errors['related_field_id']));
			else $wrapper->appendChild($label);
			
			$label = Widget::Label(__('Filter by Tags or Categories') . '<i>' . __('Comma Separated List') . '</i>');
			$label->appendChild(Widget::Input('fields['.$this->get('sortorder').'][filter_tags]', $this->get('filter_tags')));
			$wrapper->appendChild($label);
			$wrapper->appendChild($this->getFilter());
						
			$label = Widget::Label();
			$input = Widget::Input('fields['.$this->get('sortorder').'][allow_multiple_selection]', 'yes', 'checkbox');
			if($this->get('allow_multiple_selection') == 'yes') $input->setAttribute('checked', 'checked');			
			$label->setValue(__('%s Allow selection of multiple options', array($input->generate())));
			$wrapper->appendChild($label);

			$label = Widget::Label();
			$input = Widget::Input('fields['.$this->get('sortorder').'][show_count]', 'yes', 'checkbox');
			if($this->get('show_count') == 'yes') $input->setAttribute('checked', 'checked');			
			$label->setValue(__('%s Show file count instead of file names in entry overview', array($input->generate())));
			$wrapper->appendChild($label);
			
			$this->appendShowColumnCheckbox($wrapper);
						
		}

		function commit(){
			
			if(!parent::commit()) return false;
			
			$id = $this->get('id');			
			
			if($id === false) return false;
			
			$fields = array();
			$fields['field_id'] = $id;
			
			$title_field = $this->Database->fetch(	
				"SELECT t2.`id` 
				FROM  `tbl_fields` AS t1
				INNER JOIN  `tbl_fields` AS t2
				WHERE t1.`id` =  '" . $this->get('related_field_id') . "'
				AND t1.`parent_section` = t2.`parent_section` 
				AND t2.`sortorder` =  '0'
				LIMIT 1"		
			);	
			$fields['related_title_id'] = $title_field[0]['id'];
			
			$related_section = $this->Database->fetch(
				"SELECT `parent_section`
				FROM `tbl_fields` 
				WHERE `id` = " . $this->get('related_field_id') . "
				LIMIT 1"
			);
			$fields['related_section_id'] = $related_section[0]['parent_section'];	
						
			if($this->get('related_field_id') != '') $fields['related_field_id'] = $this->get('related_field_id');	

			if($this->get('filter_tags') != '') {
				$tags = explode(",", $this->get('filter_tags'));
				foreach($tags as &$tag) {
					$tag = trim($this->cleanValue($tag));
					$list[] = $tag;
				}
				$fields['filter_tags'] = implode(', ', $list);
			}

			$fields['allow_multiple_selection'] = ($this->get('allow_multiple_selection') ? $this->get('allow_multiple_selection') : 'no');
			$fields['show_count'] = ($this->get('show_count') ? $this->get('show_count') : 'no');
			
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
		
		function getFilter() {
		
			$filter = new XMLElement('ul', NULL, array('class' => 'tags'));
			
			$fields = $this->getFilterFields();
			
			$tags = array();
			foreach($fields as $field) {
				$entries = $this->Database->fetch(	
					"SELECT DISTINCT `value` FROM `tbl_entries_data_" . $field['id'] . "` LIMIT 100"		
				);
				foreach($entries as $entry) {
					$tags[] = $entry['value'];
				}
			}

			$tags = array_unique($tags);
			natcasesort($tags);
			foreach($tags as $tag) {
				$list = new XMLElement('li', $tag);
				$filter->appendChild($list);
			}
			
			return $filter;
		
		}
		
		function getFilterFields() {

			return $this->Database->fetch(	
				"SELECT t1.`id` 
				FROM  `tbl_fields` AS t1
				INNER JOIN  `tbl_fields` AS t2
				WHERE t1.`type` LIKE 'taglist' AND t1.`parent_section` = t2.`parent_section` AND t2.`id` = '".$this->get('related_field_id')."'
				OR t1.`type` LIKE 'select' AND t1.`parent_section` = t2.`parent_section` ANd t2.`id` = '".$this->get('related_field_id')."'
				LIMIT 30"		
			);
		
		}

		// Publish Entry (New, Edit)

		function displayPublishPanel(&$wrapper, $data=NULL, $flagWithError=NULL, $fieldnamePrefix=NULL, $fieldnamePostfix=NULL){

			global $ext_mootools, $ext_mediathek;
			
			if(empty($ext_mootools) && $_GET['mediathek'] != 'true' && $_POST['mediathek'] != 'true') {
				$this->_engine->Page->addScriptToHead(URL . '/extensions/mediathek/lib/mootools-1.2.1-core.js', 100);
				$ext_mootools = '121'; // save mootools version number
			}
			if(empty($ext_mootools_drag) && $_GET['mediathek'] != 'true' && $_POST['mediathek'] != 'true') {
				$this->_engine->Page->addScriptToHead(URL . '/extensions/mediathek/lib/mootools-1.2-drag.js', 105);
				$ext_mootools_drag = '120'; // save mootools version number
			}
			if(empty($ext_quicksilver) && $_GET['mediathek'] != 'true' && $_POST['mediathek'] != 'true') {
				$this->_engine->Page->addScriptToHead(URL . '/extensions/mediathek/lib/quicksilver.js', 110);
				$ext_quicksilver = '100'; // save mootools version number
			}
			if(empty($ext_mediathek) && $_GET['mediathek'] != 'true' && $_POST['mediathek'] != 'true') {
				$this->_engine->Page->addScriptToHead(URL . '/extensions/mediathek/assets/mediathek.js', 115);
				$this->_engine->Page->addStylesheetToHead(URL . '/extensions/mediathek/assets/mediathek.css', 'screen', 120);
				$ext_mediathek = '110'; // save mediathek version number
			}

			$states = $this->findOptions();
			$options = array();
			
			if(!is_array($data['relation_id'])) $data['relation_id'] = array($data['relation_id']);

			if($this->get('allow_multiple_selection') != 'yes') $options[] = array(NULL, false);

			$entry_ids = $data['relation_id'];
			foreach($states as $id){
				$options[] = array($id['id'], in_array($id['id'], $entry_ids), URL . '/workspace' . $id['file'], NULL, NULL, array('label' => $id['title']) );
			}
					
			$fieldname = 'fields'.$fieldnamePrefix.'['.$this->get('element_name').']'.$fieldnamePostfix;
			$fieldname .= '[]';
			
			$title = $this->get('label') . '<i>' . ($this->get('allow_multiple_selection') == 'yes' ? __('Multiple Choice') : __('Single Choice')) . '</i>';
			$label = Widget::Label($title, NULL, 'media');
			$label->appendChild(Widget::Select($fieldname, $options, ($this->get('allow_multiple_selection') == 'yes' ? array('multiple' => 'multiple', 'class' => 'source') : array('class' => 'source')) ));
			$media = new XMLElement('a', NULL, array('class' => 'media'));
			$media = $this->createMediathek();
			
			if($flagWithError != NULL) {
				$wrapper->appendChild(Widget::wrapFormElementWithError($media, $flagWithError));
			}
			else {
				$wrapper->appendChild($label);
				$wrapper->appendChild($media);
			}		
		
		}
		
		function findOptions() { 

			$values = array();
			
			if($this->get('filter_tags') != '') {
				$tags = explode(",", $this->get('filter_tags'));
				foreach($tags as &$tag) {
					$tag = trim($this->cleanValue($tag));
					if(substr($tag, 0, 1) == '-') $tags_out[] = substr($tag, 1);
					else $tags_in[] = $tag;		
				}
				$fields = $this->getFilterFields();
				$count = 3;
				foreach($fields as $field) { 
					$join .= "INNER JOIN  `tbl_entries_data_" . $field['id'] . "` AS t" .$count . " ";
					$id .= "AND t1.`entry_id` = t" . $count . ".`entry_id` ";
					if($count > 3) $in .= "OR ";
					$in .= "t" . $count . ".`value` IN ('" . implode("', '", $tags_in) . "') ";
					if($count > 3) $out .= "OR ";
					$out .= "t" . $count . ".`value` IN ('" . implode("', '", $tags_out) . "') ";					
					$count++;
				}
			}
		
			if($tags_in) {
				$sql = "SELECT t1.`entry_id`, t1.`file`, t2.`value` 
					FROM  `tbl_entries_data_" . $this->get('related_field_id') . "` AS t1 
					INNER JOIN  `tbl_entries_data_" . $this->get('related_title_id') . "` AS t2 "
					. $join . "WHERE t1.`entry_id` = t2.`entry_id` " . $id . "AND (" . $in . ") 
					LIMIT 0 , 300";
			}
			else {
				$sql = "SELECT t1.`entry_id`, t1.`file`, t2.`value` 
					FROM  `tbl_entries_data_" . $this->get('related_field_id') . "` AS t1 
					INNER JOIN  `tbl_entries_data_" . $this->get('related_title_id') . "` AS t2 
					WHERE t1.`entry_id` = t2.`entry_id` 
					LIMIT 0 , 300";
			}
			
			$filter = array();
			if($tags_out) {
				$filter = $this->Database->fetchcol('entry_id', 
					"SELECT t1.`entry_id` 
					FROM  `tbl_entries_data_" . $this->get('related_field_id') . "` AS t1 
					INNER JOIN  `tbl_entries_data_" . $this->get('related_title_id') . "` AS t2 "
					. $join . "WHERE t1.`entry_id` = t2.`entry_id` " . $id . "AND (" . $out . ") 
					LIMIT 0 , 300"
				);
			}
			
			// options array
			if($results = $this->Database->fetch($sql)) {
				foreach($results as $result){
					if(!in_array($result['entry_id'], $filter)) {
						$values[$result['entry_id']]['id'] = $result['entry_id'];				
						$values[$result['entry_id']]['file'] = $result['file'];				
						$values[$result['entry_id']]['title'] = $result['value'];				
					}
				}
			}

			return $values;

		}
			
		function createMediathek() {
		
			$media = new XMLElement('div', NULL, array(
				'class' => 'media'
			));
			
			$actions = new XMLElement('div', NULL, array(
				'class' => 'actions'
			));
				$toggler = new XMLElement('a', __('Show Selected') . '<br />|' . __('Show All'));
				$search = new XMLElement('p');
					$input = Widget::Input('', NULL, 'text', array(
						'class' => 'search'
					));
					$anchor = new XMLElement('a', __('Search'));
				$search->appendChild($input);
				$search->appendChild($anchor);
			$actions->appendChild($toggler);	
			$actions->appendChild($search);	
							
			if($_GET['mediathek'] != 'true' && $_POST['mediathek'] != 'true') {
				$create = $this->createInlineUpload();
				$actions->appendChild($create);
			}	
		
			$list = new XMLElement('ul');
				$preview = new XMLElement('li', __('Preview'));
				$drop = new XMLElement('li', __('Drop Item'));
			$list->appendChild($preview);
			$list->appendChild($drop);
			
			$media->appendChild($actions);
			$media->appendChild($list);
			return $media;
			
		}
		
		function createInlineUpload() {
		
			$linked_section = $this->Database->fetch(
				"SELECT `handle`
				FROM  `tbl_sections`
				WHERE `id` = '".$this->get('related_section_id')."' 
				LIMIT 1"
			);	
			$new = new XMLElement('a', __('Create New'), array(
				'title' => __('Create new entry in related section'),
				'href' => URL . '/symphony/publish/' . $linked_section[0]['handle'] . '/new/',
				'class' => 'create'
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
		
			if(empty($data['relation_id'])) return NULL;

			if($this->get('show_count') == 'yes') {
				$count = count($data['relation_id']);
				return parent::prepareTableValue(array('value' => ($count > 1) ? $count . ' ' . __('files') : $count . ' ' . __('file')), $link);
			}
			else {
				if(!is_array($data['relation_id'])) $data['relation_id'] = array($data['relation_id']);
		
				$files = $this->Database->fetch(
					"SELECT `file`
					FROM  `tbl_entries_data_" . $this->get('related_field_id') . "`
					WHERE `entry_id` IN ('" . implode("', '", $data['relation_id']) . "') 
					LIMIT 30"
				);
	
				if(empty($files)) return NULL;
	
				$count = 1;
				foreach($files as $file) {
					if($count > 1) $link .= '<br />';
					$link .= '<a href="' . URL . '/workspace' . $file['file'] . '">' . basename($file['file']) . '</a>';
					$count++;
				}
				return $link;
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

		public function appendFormattedElement(&$wrapper, $data, $encode = false, $mode = null) {

			if(!is_array($data) or empty($data)) return;
			if(!is_array($data['relation_id'])) $data['relation_id'] = array($data['relation_id']);
			
			// get title information
			$titles = $this->_engine->Database->fetch(
				"SELECT `entry_id`, `value`, `handle`  
				FROM `tbl_entries_data_" . $this->get('related_title_id') . "`  
				WHERE `entry_id` IN (" . implode(', ', $data['relation_id']) . ") 
				LIMIT 100"
			);
			foreach($titles as $title) {
				$filedata[$title['entry_id']]['value'] = $title['value'];
				$filedata[$title['entry_id']]['handle'] = $title['handle'];
			}
			
			// get file information
			$files = $this->_engine->Database->fetch(
				"SELECT `entry_id`, `file`, `mimetype`, `meta` 
				FROM `tbl_entries_data_" . $this->get('related_field_id') . "` 
				WHERE `entry_id` IN (" . implode(', ', $data['relation_id']) . ") 
				LIMIT 100"
			);
			foreach($files as $file) {
				$filedata[$file['entry_id']]['file'] = $file['file'];
				$filedata[$file['entry_id']]['mimetype'] = $file['mimetype'];
				$filedata[$file['entry_id']]['meta'] = $file['meta'];
			}

			// set mediathek attributes
			$list = new XMLElement($this->get('element_name'), NULL, array(
				'count' => count($data['relation_id']),
				'related-section-id' => $this->get('related_section_id'),
				'path' => str_replace(WORKSPACE, NULL, dirname(WORKSPACE . $files[0]['file']))
			));

			// create items
			foreach ($data['relation_id'] as $index => $value) {
				$item = new XMLElement('item', NULL, array(
					'related-id' => $data['relation_id'][$index],
					'size' => General::formatFilesize(filesize(WORKSPACE . $filedata[$value]['file'])),
					'type' =>  $filedata[$value]['mimetype']
				));
				$item->appendChild(new XMLElement('title', $filedata[$value]['value'], array('handle' => $filedata[$value]['handle'])));
				$item->appendChild(new XMLElement('filename', General::sanitize(basename($filedata[$value]['file']))));

				$m = unserialize($filedata[$value]['meta']);
				if(is_array($m) && !empty($m)){
					$item->appendChild(new XMLElement('meta', NULL, $m));
				}

				$list->appendChild($item);
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
		
		function groupRecords($records){

			if(!is_array($records) || empty($records)) return;

			$groups = array($this->get('element_name') => array());
			
			foreach($records as $r) {
				$data = $r->getData($this->get('id'));
				$id = $data['relation_id'];
				$title_field = $this->_engine->Database->fetch(
					"SELECT `handle` 
					FROM `tbl_entries_data_" . $this->get('related_title_id') . "` 
					WHERE `entry_id` = " . $id . "
					LIMIT 0 , 1"
				);

				if(!isset($groups[$this->get('element_name')][$id])) {
					$groups[$this->get('element_name')][$id] = array(
						'attr' => array(
							'related-id' => $data['relation_id'], 
							'related-handle' => $title_field[0]['handle']
						),
						'records' => array(), 
						'groups' => array()
					);	
				}	

				$groups[$this->get('element_name')][$id]['records'][] = $r;
			}

			return $groups;

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
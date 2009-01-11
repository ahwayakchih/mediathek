<?php

	Class extension_mediathek extends Extension{
	
		public function about(){
			return array('name' => 'Field: Mediathek',
						 'version' => '1.0',
						 'release-date' => '2009-01-11',
						 'author' => array('name' => 'Nils Hörrmann',
										   'website' => 'http://www.nilshoerrmann.de',
										   'email' => 'post@nilshoerrmann.de')
				 		);
		}
   
		public function getSubscribedDelegates(){
		
			return array(
			
				array(
					'page' => '/administration/',
					'delegate' => 'AdminPagePreGenerate',
					'callback' => 'addMediathek'
				),	

				array(
					'page' => '/backend/',
					'delegate' => 'InitaliseAdminPageHead',
					'callback' => 'layoutMediasection'
				)
									
			);
		}
		
		public function layoutMediasection($context){
			if($_GET['mediathek'] == 'true' || $_POST['mediathek'] == 'true') {
				$context['parent']->Page->addStylesheetToHead(URL . '/extensions/mediathek/assets/mediasection.css', 'screen', 100);
			}
		}
		
		public function addMediathek($context){
			if($_GET['mediathek'] == 'true') {
				$context['parent']->Page->_navigation = array();
				$action = $context['parent']->Page->Form->getAttribute('action');
				$context['parent']->Page->Form->setAttribute('action', $action . '?mediathek=true');
			}
		}
	
		public function uninstall(){
			$this->_Parent->Database->query("DROP TABLE `tbl_fields_mediathek`");
		}

		public function install(){

			return $this->_Parent->Database->query("CREATE TABLE `tbl_fields_mediathek` (
		 	  `id` int(11) unsigned NOT NULL auto_increment,
			  `field_id` int(11) unsigned NOT NULL,
			  `related_field_id` int(11) unsigned default NULL,
			  PRIMARY KEY  (`id`),
			  KEY `field_id` (`field_id`)
			) TYPE=MyISAM;");

		}
			
	}


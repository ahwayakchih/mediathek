<?php

	Class extension_mediathek extends Extension {
	
		public function about() {
		
			return array(
				'name' => 'Field: Mediathek',
				'version' => '1.1.2',
				'release-date' => '2009-03-05',
				'author' => array(
					'name' => 'Nils Hörrmann',
					'website' => 'http://www.nilshoerrmann.de',
					'email' => 'post@nilshoerrmann.de'
				)
	 		);
		
		}
   
		public function getSubscribedDelegates() {
		
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
		
		public function layoutMediasection($context) {

			if($_GET['mediathek'] == 'true' || $_POST['mediathek'] == 'true') {
				$context['parent']->Page->addStylesheetToHead(URL . '/extensions/mediathek/assets/mediasection.css', 'screen', 100);
			}

		}
		
		public function addMediathek($context) {

			if($_GET['mediathek'] == 'true') {
				$context['parent']->Page->_navigation = array();
				$action = $context['parent']->Page->Form->getAttribute('action');
				$context['parent']->Page->Form->setAttribute('action', $action . '?mediathek=true');
			}

		}
	
		public function uninstall() {

			Administration::instance()->Database->query("DROP TABLE `tbl_fields_mediathek`");

		}

		public function install() {

			return Administration::instance()->Database->query(
				"CREATE TABLE `tbl_fields_mediathek` (
				`id` int(11) unsigned NOT NULL auto_increment,
				`field_id` int(11) unsigned NOT NULL,
				`related_field_id` int(11) unsigned default NULL,
				`related_title_id` int(11) unsigned default NULL,
				`related_section_id` int(11) unsigned default NULL,
				`filter_tags` text,
				`allow_multiple_selection` enum('yes','no') NOT NULL default 'yes',
				`show_count` enum('yes','no') NOT NULL default 'no',
				PRIMARY KEY  (`id`),
				KEY `field_id` (`field_id`)
				) TYPE=MyISAM;"
			);

		}
		
		public function update() {
		
			if(version_compare($previousVersion, '1.1', '<')){
				Administration::instance()->Database->query("ALTER TABLE `tbl_fields_mediathek` ADD `allow_multiple_selection` enum('yes','no') NOT NULL default 'yes'");
				Administration::instance()->Database->query("ALTER TABLE `tbl_fields_mediathek` ADD `filter_tags` text");
				Administration::instance()->Database->query("ALTER TABLE `tbl_fields_mediathek` ADD `related_title_id` int(11) unsigned default NULL");
				Administration::instance()->Database->query("ALTER TABLE `tbl_fields_mediathek` ADD `related_section_id` int(11) unsigned default NULL");
				Administration::instance()->Database->query("ALTER TABLE `tbl_fields_mediathek` ADD `show_count` enum('yes','no') NOT NULL default 'no'");
			}
			return true;		

		}
			
	}


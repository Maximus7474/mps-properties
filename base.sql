-- Dumping structure for table astrum_ox.properties
CREATE TABLE IF NOT EXISTS `properties` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `address` varchar(255) NOT NULL,
  `status` enum('bought','for_sale','for_rental','rented') NOT NULL,
  `expiryDate` datetime DEFAULT NULL,
  `location_x` int(11) NOT NULL,
  `location_y` int(11) NOT NULL,
  `location_z` int(11) NOT NULL,
  `location_w` int(11) NOT NULL,
  `interior_type` enum('property','garage') NOT NULL,
  `interior_ipl_name` varchar(100) DEFAULT NULL,
  `interior_ipl_colorref` varchar(50) DEFAULT NULL,
  `interior_shell_model` varchar(100) DEFAULT NULL,
  `interior_shell_position_x` int(11) DEFAULT NULL,
  `interior_shell_position_y` int(11) DEFAULT NULL,
  `interior_shell_position_z` int(11) DEFAULT NULL,
  `interior_shell_position_w` int(11) DEFAULT NULL,
  `furniture` longtext DEFAULT NULL,
  `owner` int(10) unsigned DEFAULT NULL,
  `group` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `group_fk` (`group`),
  KEY `owner_fk` (`owner`),
  CONSTRAINT `group_fk` FOREIGN KEY (`group`) REFERENCES `ox_groups` (`name`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `owner_fk` FOREIGN KEY (`owner`) REFERENCES `characters` (`charId`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Dumping structure for table astrum_ox.properties_keyholders
CREATE TABLE IF NOT EXISTS `properties_keyholders` (
  `charId` int(10) unsigned NOT NULL,
  `propertyId` int(10) NOT NULL,
  `canFurnish` int(1) unsigned NOT NULL DEFAULT 0,
  `canFinance` int(1) unsigned NOT NULL DEFAULT 0,
  `canGrantAccess` int(1) unsigned NOT NULL DEFAULT 0,
  KEY `fk_charId` (`charId`),
  KEY `propertyId_fk` (`propertyId`),
  CONSTRAINT `fk_charId` FOREIGN KEY (`charId`) REFERENCES `characters` (`charId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `propertyId_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

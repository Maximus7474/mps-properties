CREATE TABLE IF NOT EXISTS `properties` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `address` varchar(255) NOT NULL,
  `status` enum('bought','for_sale','for_rental','rented') NOT NULL,
  `expiryDate` datetime DEFAULT NULL,
  `location_x` FLOAT NOT NULL,
  `location_y` FLOAT NOT NULL,
  `location_z` FLOAT NOT NULL,
  `location_w` FLOAT NOT NULL,
  `interior_type` enum('property','garage') NOT NULL,
  `interior_ipl_name` varchar(100) DEFAULT NULL,
  `interior_ipl_colorref` varchar(50) DEFAULT NULL,
  `interior_shell_model` varchar(100) DEFAULT NULL,
  `interior_shell_position_x` FLOAT DEFAULT NULL,
  `interior_shell_position_y` FLOAT DEFAULT NULL,
  `interior_shell_position_z` FLOAT DEFAULT NULL,
  `interior_shell_position_w` FLOAT DEFAULT NULL,
  `furniture` JSON DEFAULT NULL,
  `owner` int(10) unsigned DEFAULT NULL,
  `group` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `group_fk` (`group`),
  KEY `owner_fk` (`owner`),
  CONSTRAINT `group_fk` FOREIGN KEY (`group`) REFERENCES `ox_groups` (`name`) ON DELETE SET NULL,
  CONSTRAINT `owner_fk` FOREIGN KEY (`owner`) REFERENCES `characters` (`charId`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4;

CREATE TABLE IF NOT EXISTS `properties_keyholders` (
  `charId` INT(10) unsigned NOT NULL,
  `propertyId` INT(10) NOT NULL,
  `canFurnish` TINYINT(1) unsigned NOT NULL DEFAULT 0,
  `canFinance` TINYINT(1) unsigned NOT NULL DEFAULT 0,
  `canGrantAccess` TINYINT(1) unsigned NOT NULL DEFAULT 0,
  UNIQUE KEY `char_property_unique` (`charId`, `propertyId`),
  CONSTRAINT `fk_charId` FOREIGN KEY (`charId`) REFERENCES `characters` (`charId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `propertyId_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

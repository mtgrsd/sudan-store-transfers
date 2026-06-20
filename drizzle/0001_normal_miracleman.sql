CREATE TABLE `agent_wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`currencyCode` varchar(10) NOT NULL,
	`balance` decimal(18,8) NOT NULL DEFAULT '0',
	`frozenBalance` decimal(18,8) NOT NULL DEFAULT '0',
	`totalReceived` decimal(18,8) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`agentCode` varchar(50) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_agentCode_unique` UNIQUE(`agentCode`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`details` json,
	`ipAddress` varchar(50),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_wallet` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currencyCode` varchar(10) NOT NULL,
	`balance` decimal(18,8) NOT NULL DEFAULT '0',
	`totalTransferred` decimal(18,8) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_wallet_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_wallet_currencyCode_unique` UNIQUE(`currencyCode`)
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`symbol` varchar(10) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `currencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `currencies_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` varchar(50) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_customerId_unique` UNIQUE(`customerId`)
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`entryType` enum('debit','credit') NOT NULL,
	`accountType` enum('agent','company') NOT NULL,
	`accountId` int NOT NULL,
	`amount` decimal(18,8) NOT NULL,
	`currencyCode` varchar(10) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `transfer_confirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` int NOT NULL,
	`agentId` int NOT NULL,
	`confirmedByUserId` int NOT NULL,
	`confirmationTime` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(50),
	`userAgent` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transfer_confirmations_id` PRIMARY KEY(`id`),
	CONSTRAINT `transfer_confirmations_transferId_unique` UNIQUE(`transferId`)
);
--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transferId` varchar(50) NOT NULL,
	`notificationNumber` varchar(50) NOT NULL,
	`secretCode` varchar(50) NOT NULL,
	`agentId` int NOT NULL,
	`customerId` int NOT NULL,
	`amount` decimal(18,8) NOT NULL,
	`currencyCode` varchar(10) NOT NULL,
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`qrCode` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	`cancelledAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `transfers_transferId_unique` UNIQUE(`transferId`),
	CONSTRAINT `transfers_notificationNumber_unique` UNIQUE(`notificationNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','agent') NOT NULL DEFAULT 'agent';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `agent_wallet_idx` ON `agent_wallets` (`agentId`,`currencyCode`);--> statement-breakpoint
CREATE INDEX `agent_userId_idx` ON `agents` (`userId`);--> statement-breakpoint
CREATE INDEX `agent_code_idx` ON `agents` (`agentCode`);--> statement-breakpoint
CREATE INDEX `agent_active_idx` ON `agents` (`isActive`);--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_id_idx` ON `customers` (`customerId`);--> statement-breakpoint
CREATE INDEX `customer_active_idx` ON `customers` (`isActive`);--> statement-breakpoint
CREATE INDEX `ledger_transfer_idx` ON `ledger_entries` (`transferId`);--> statement-breakpoint
CREATE INDEX `ledger_account_idx` ON `ledger_entries` (`accountType`,`accountId`);--> statement-breakpoint
CREATE INDEX `confirmation_transfer_idx` ON `transfer_confirmations` (`transferId`);--> statement-breakpoint
CREATE INDEX `confirmation_agent_idx` ON `transfer_confirmations` (`agentId`);--> statement-breakpoint
CREATE INDEX `transfer_agent_idx` ON `transfers` (`agentId`);--> statement-breakpoint
CREATE INDEX `transfer_customer_idx` ON `transfers` (`customerId`);--> statement-breakpoint
CREATE INDEX `transfer_status_idx` ON `transfers` (`status`);--> statement-breakpoint
CREATE INDEX `transfer_notification_idx` ON `transfers` (`notificationNumber`);--> statement-breakpoint
CREATE INDEX `transfer_id_idx` ON `transfers` (`transferId`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `users` (`isActive`);
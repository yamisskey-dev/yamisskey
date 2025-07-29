/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddCloudflareRealtimeSettings1752200000000 {
	name = 'AddCloudflareRealtimeSettings1752200000000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareRealtimeEnabled" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareRealtimeAppId" character varying(1024)`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "cloudflareRealtimeAppSecret" character varying(1024)`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareRealtimeAppSecret"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareRealtimeAppId"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "cloudflareRealtimeEnabled"`);
	}
}

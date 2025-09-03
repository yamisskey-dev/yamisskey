/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddHideRegistrationDate1703000000000 {
    constructor() {
        this.name = 'AddHideRegistrationDate1703000000000';
    }

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "hideRegistrationDate" boolean NOT NULL DEFAULT true`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "hideRegistrationDate"`);
    }
}
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class RemoveHideRegistrationDate1730880000000 {
    constructor() {
        this.name = 'RemoveHideRegistrationDate1730880000000';
    }

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "hideRegistrationDate"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "hideRegistrationDate" boolean NOT NULL DEFAULT true`);
    }
}

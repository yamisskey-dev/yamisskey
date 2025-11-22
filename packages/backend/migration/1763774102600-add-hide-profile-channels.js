/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddHideProfileChannels1763774102600 {
    name = 'AddHideProfileChannels1763774102600'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "hideProfileChannels" boolean NOT NULL DEFAULT ${process.env.NODE_ENV === 'test' ? 'false' : 'true'}`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "hideProfileChannels"`);
    }
}

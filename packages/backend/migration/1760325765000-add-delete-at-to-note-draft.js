/*
 * SPDX-FileCopyrightText: hitalin and yamisskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddDeleteAtToNoteDraft1760325765000 {
    name = 'AddDeleteAtToNoteDraft1760325765000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_draft" ADD "deleteAt" TIMESTAMP WITH TIME ZONE`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_draft" DROP COLUMN "deleteAt"`);
    }
}

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddIsNoteInYamiModeToNoteDraft1752609999999 {
	name = 'AddIsNoteInYamiModeToNoteDraft1752609999999'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "note_draft" ADD "isNoteInYamiMode" boolean NOT NULL DEFAULT false`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "note_draft" DROP COLUMN "isNoteInYamiMode"`);
	}
}

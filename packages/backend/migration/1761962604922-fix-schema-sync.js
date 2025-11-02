/*
 * SPDX-FileCopyrightText: hitalin and yamisskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */ export class FixSchemaSync1761962604922 {
    name = 'FixSchemaSync1761962604922';
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "requireSigninToViewContents" SET DEFAULT true`);
        await queryRunner.query(`COMMENT ON COLUMN "user_profile"."listenbrainz" IS 'The ListenBrainz username of the User.'`);
        await queryRunner.query(`ALTER TYPE "public"."user_profile_notesVisibility_enum" RENAME TO "user_profile_notesVisibility_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."user_profile_notesvisibility_enum" AS ENUM('public', 'followers', 'private')`);
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "notesVisibility" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "notesVisibility" TYPE "public"."user_profile_notesvisibility_enum" USING "notesVisibility"::"text"::"public"."user_profile_notesvisibility_enum"`);
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "notesVisibility" SET DEFAULT 'private'`);
        await queryRunner.query(`DROP TYPE "public"."user_profile_notesVisibility_enum_old"`);
        await queryRunner.query(`ALTER TABLE "instance" DROP COLUMN "reversiVersion"`);
        await queryRunner.query(`ALTER TABLE "instance" ADD "reversiVersion" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "proxyRemoteFiles" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "reversi_game" DROP COLUMN "federationId"`);
        await queryRunner.query(`ALTER TABLE "reversi_game" ADD "federationId" character varying(36)`);
        await queryRunner.query(`COMMENT ON COLUMN "role"."isCommunity" IS 'Whether this role was created by community users (not admins)'`);
        await queryRunner.query(`UPDATE "user_pending" SET "reason" = '' WHERE "reason" IS NULL`);
        await queryRunner.query(`ALTER TABLE "user_pending" ALTER COLUMN "reason" SET NOT NULL`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_pending" ALTER COLUMN "reason" DROP NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "role"."isCommunity" IS NULL`);
        await queryRunner.query(`ALTER TABLE "reversi_game" DROP COLUMN "federationId"`);
        await queryRunner.query(`ALTER TABLE "reversi_game" ADD "federationId" character varying`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "proxyRemoteFiles" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "instance" DROP COLUMN "reversiVersion"`);
        await queryRunner.query(`ALTER TABLE "instance" ADD "reversiVersion" character varying(32)`);
        await queryRunner.query(`CREATE TYPE "public"."user_profile_notesVisibility_enum_old" AS ENUM('public', 'followers', 'private')`);
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "notesVisibility" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "notesVisibility" TYPE "public"."user_profile_notesVisibility_enum_old" USING "notesVisibility"::"text"::"public"."user_profile_notesVisibility_enum_old"`);
        await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "notesVisibility" SET DEFAULT 'private'`);
        await queryRunner.query(`DROP TYPE "public"."user_profile_notesvisibility_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_profile_notesVisibility_enum_old" RENAME TO "user_profile_notesVisibility_enum"`);
        await queryRunner.query(`COMMENT ON COLUMN "user_profile"."listenbrainz" IS 'listenbrainz username to fetch currently playing.'`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "requireSigninToViewContents" SET DEFAULT false`);
    }
}

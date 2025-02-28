export class UpdateChannelPropagateDefault1740578400000 {
  name = 'UpdateChannelPropagateDefault1740578400000'

  async up(queryRunner) {
    // まずカラムを追加する
    await queryRunner.query(`ALTER TABLE "channel" ADD COLUMN "propagateToTimelines" boolean DEFAULT false`);

    // 既存のすべてのチャンネルの値をfalseに更新
    await queryRunner.query(`UPDATE "channel" SET "propagateToTimelines" = false WHERE "propagateToTimelines" IS NULL`);
  }

  async down(queryRunner) {
    // ロールバック時に既存のチャンネルの値をtrueに戻す
    await queryRunner.query(`UPDATE "channel" SET "propagateToTimelines" = true`);

    // カラムを削除
    await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "propagateToTimelines"`);
  }
}

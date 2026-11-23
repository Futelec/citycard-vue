/**
 * 金币技能：挑拨离间
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'

export function createExecuteTiaoBoBaoLiJian(gameStore) {
  return function executeTiaoBoBaoLiJian(caster, target) {
    // 检查游戏模式（仅限2v2）
    if (gameStore.gameMode !== '2v2') {
      return {
        success: false,
        message: '挑拨离间仅限2v2模式使用！'
      }
    }

    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 获取对手的队友
    const allPlayers = gameStore.players
    const targetTeammates = allPlayers.filter(p =>
      p.name !== caster.name &&
      p.name !== target.name &&
      p.team === target.team
    )

    if (targetTeammates.length === 0) {
      return {
        success: false,
        message: '无法找到对手的队友！'
      }
    }

    const teammate = targetTeammates[0]

    // 检查对手团队是否有坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '挑拨离间')) {
      // 双日志：被阻挡
      addSkillUsageLog(
        gameStore,
        caster.name,
        '挑拨离间',
        `${caster.name}使用了挑拨离间，挑拨离间被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了挑拨离间，但被${target.name}的坚不可摧护盾阻挡`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    if (gameStore.isBlockedByJianbukecui(teammate.name, caster.name, '挑拨离间')) {
      // 双日志：被阻挡
      addSkillUsageLog(
        gameStore,
        caster.name,
        '挑拨离间',
        `${caster.name}使用了挑拨离间，挑拨离间被${teammate.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了挑拨离间，但被${teammate.name}的坚不可摧护盾阻挡`
      )
      return {
        success: false,
        message: `被${teammate.name}的坚不可摧护盾阻挡`
      }
    }

    // 设置挑拨离间标记
    gameStore.tblj[caster.name] = {
      mode: '2v2',
      targetTeam: target.team
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '挑拨离间',
      `挑拨离间生效，${caster.name}的队伍本轮撤兵，${target.name}和${teammate.name}将互相攻击`,
      `你对${target.name}使用了挑拨离间`
    )

    return {
      success: true,
      message: `你的队伍本轮撤兵，${target.name}和${teammate.name}将互相攻击`
    }
  }
}

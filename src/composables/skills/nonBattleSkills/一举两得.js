/**
 * 金币技能：一举两得
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteYiJuLiangDe(gameStore) {
  return function executeYiJuLiangDe(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查对手存活城市数
    const oppAliveCities = Object.values(target.cities).filter(c => c && (c.currentHp || c.hp) > 0)
    if (oppAliveCities.length < TUNE.yiJuLiangDe.minOppAliveCities) {
      return {
        success: false,
        message: `${target.name}存活城市不足2个，无法使用一举两得`
      }
    }

    // 检查双方卡牌数量都≥3
    const myAliveCities = Object.values(caster.cities).filter(c => c && (c.currentHp || c.hp) > 0)
    if (myAliveCities.length < TUNE.yiJuLiangDe.minCities || oppAliveCities.length < TUNE.yiJuLiangDe.minCities) {
      return {
        success: false,
        message: `一举两得需要双方卡牌数量都≥3！当前你有${myAliveCities.length}个，对方有${oppAliveCities.length}个`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('一举两得', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '一举两得')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '一举两得',
        `${caster.name}使用一举两得，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了一举两得`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }


    // 设置强制出战2个城市的标记（仅本回合有效）
    if (!gameStore.forceDeployTwo) {
      gameStore.forceDeployTwo = {}
    }
    gameStore.forceDeployTwo[target.name] = {
      active: true,
      round: gameStore.currentRound
    }

    // 一举两得禁用按兵不动（仅本回合有效）
    if (!gameStore.cannotStandDown) {
      gameStore.cannotStandDown = {}
    }
    gameStore.cannotStandDown[target.name] = {
      active: true,
      round: gameStore.currentRound
    }

    // 记录私有日志
    if (gameStore.addPrivateLog) {
      gameStore.addPrivateLog(caster.name, `你对${target.name}使用了一举两得，对方本回合必须派出2个城市，无法使用按兵不动`)
    }

    // 记录公开日志
    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '一举两得',
      `${caster.name}对${target.name}使用了一举两得`,
      `${caster.name}使用了一举两得`
    )


    return {
      success: true,
      message: `成功使用一举两得！${target.name}本回合必须派出2个城市`
    }
  }
}

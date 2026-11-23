/**
 * 金币技能：明察秋毫
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteMingChaQiuHao(gameStore) {
  return function executeMingChaQiuHao(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('明察秋毫', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '明察秋毫')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '明察秋毫',
        `${caster.name}使用明察秋毫，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了明察秋毫`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }


    // 获取对手的当前部署
    const oppState = gameStore.playerStates[target.name]
    if (!oppState || !oppState.currentBattleCities || oppState.currentBattleCities.length === 0) {
      // 对方未部署，返还金币
      caster.gold += SKILL_COSTS['一举两得']
      return {
        success: false,
        message: `${target.name}还未部署城市！金币已返还`
      }
    }

    // 构建部署信息
    const deploymentInfo = []
    oppState.currentBattleCities.forEach(card => {
      const city = target.cities[card.cityName]
      if (!city) return

      deploymentInfo.push({
        name: city.name,
        hp: Math.floor(city.currentHp || city.hp)
      })

      // 标记为已知城市
      gameStore.setCityKnown(target.name, card.cityName, caster.name)
    })

    const infoText = deploymentInfo.map(info =>
      `${info.name}（HP:${info.hp}）`
    ).join('\n')

    // 记录私有日志
    if (gameStore.addPrivateLog) {
      gameStore.addPrivateLog(caster.name, `你对${target.name}使用了明察秋毫，查看到对方部署：\n${infoText}`)
    }

    // 记录公开日志
    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '明察秋毫',
      `${caster.name}对${target.name}使用了明察秋毫`,
      `${caster.name}使用了明察秋毫`
    )

    return {
      success: true,
      message: `明察秋毫：\n\n${target.name}的部署：\n${infoText}`,
      data: {
        deploymentInfo: deploymentInfo
      }
    }
  }
}

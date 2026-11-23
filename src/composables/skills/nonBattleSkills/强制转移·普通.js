/**
 * 金币技能：强制转移·普通
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteQiangZhiQianDuPutong(gameStore) {
  return function executeQiangZhiQianDuPutong(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    const mode = gameStore.gameMode || '2P'
    if (mode !== '2P' && mode !== '2v2') {
      return {
        success: false,
        message: '该技能仅限2P/2v2模式使用！'
      }
    }

    // 检查对手是否只剩1座城市（淘汰中心后无法选择新中心）
    const aliveCount = Object.values(target.cities).filter(c => c.isAlive !== false && c.currentHp > 0).length
    if (aliveCount <= TUNE.qiangZhiQianDuPutong.minAliveCities) {
      return {
        success: false,
        message: `${target.name}只剩1座城市，无法使用强制转移`
      }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '强制转移·普通')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '强制转移·普通',
        `${caster.name}使用强制转移·普通，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了强制转移·普通`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('强制转移·普通', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const centerName = target.centerCityName
    const centerCity = target.cities[centerName]

    if (!centerCity) {
      return { success: false, message: '对方没有中心城市' }
    }

    // 淘汰中心城市
    centerCity.isAlive = false
    centerCity.currentHp = 0

    // 添加到deadCities列表
    if (!gameStore.deadCities[target.name]) {
      gameStore.deadCities[target.name] = []
    }
    if (!gameStore.deadCities[target.name].includes(centerName)) {
      gameStore.deadCities[target.name].push(centerName)
    }

    // 设置需要选择新中心的标记
    if (!gameStore.playerStates[target.name]) {
      gameStore.playerStates[target.name] = {}
    }
    gameStore.playerStates[target.name].needsNewCenter = true
    gameStore.playerStates[target.name].newCenterReason = '强制转移·普通'

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '强制转移·普通',
      `${caster.name}对${target.name}使用了强制转移·普通，${centerCity.name}被淘汰，${target.name}需要选择新的中心城市`,
      `${caster.name}使用了强制转移·普通`
    )

    return {
      success: true,
      message: `成功淘汰${target.name}的中心城市${centerCity.name}，对方需要选择新的中心城市`,
      data: {
        destroyedCenter: centerCity.name,
        targetPlayer: target.name
      }
    }
  }
}

/**
 * 金币技能：强制转移·高级
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteQiangZhiQianDuGaoji(gameStore) {
  return function executeQiangZhiQianDuGaoji(caster, target, newCenterCity) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    if (!newCenterCity) {
      return { success: false, message: '未选择新中心城市' }
    }

    const mode = gameStore.gameMode || '2P'
    if (mode !== '2P' && mode !== '2v2') {
      return {
        success: false,
        message: '该技能仅限2P/2v2模式使用！'
      }
    }

    // 检查对手是否只剩1座城市（淘汰中心后无法存活）
    const aliveCount = Object.values(target.cities).filter(c => c.isAlive !== false && c.currentHp > 0).length
    if (aliveCount <= TUNE.qiangZhiQianDuGaoji.minAliveCities) {
      return {
        success: false,
        message: `${target.name}只剩1座城市，无法使用强制转移`
      }
    }

    const newCenterName = newCenterCity.name
    if (!target.cities[newCenterName]) {
      return { success: false, message: '目标城市不存在' }
    }

    if (newCenterCity.currentHp <= 0 || newCenterCity.isAlive === false) {
      return { success: false, message: '目标城市已阵亡' }
    }

    // 检查城市是否已知（使用isCityKnown确保正确的p_前缀键访问）
    if (!gameStore.isCityKnown(target.name, newCenterName, caster.name)) {
      return { success: false, message: '该城市尚未已知，无法指定为新中心' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '强制转移·高级')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '强制转移·高级',
        `${caster.name}使用强制转移·高级，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了强制转移·高级`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('强制转移·高级', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const oldCenterName = target.centerCityName
    const oldCenterCity = target.cities[oldCenterName]

    // 淘汰旧中心城市
    if (oldCenterCity) {
      oldCenterCity.isAlive = false
      oldCenterCity.currentHp = 0
      oldCenterCity.isCenter = false

      // 添加到deadCities列表
      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (!gameStore.deadCities[target.name].includes(oldCenterName)) {
        gameStore.deadCities[target.name].push(oldCenterName)
      }
    }

    // 设置新中心城市
    newCenterCity.isCenter = true
    target.centerCityName = newCenterName

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '强制转移·高级',
      `${caster.name}对${target.name}使用了强制转移·高级，${oldCenterCity?.name}被淘汰，${newCenterCity.name}成为新的中心城市`,
      `${caster.name}使用了强制转移·高级`
    )

    return {
      success: true,
      message: `成功将${newCenterCity.name}设为${target.name}的新中心城市，旧中心${oldCenterCity?.name}已阵亡`,
      data: {
        oldCenter: oldCenterCity?.name,
        newCenter: newCenterCity.name,
        targetPlayer: target.name
      }
    }
  }
}

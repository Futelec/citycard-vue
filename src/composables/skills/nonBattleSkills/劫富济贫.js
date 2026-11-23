/**
 * 金币技能：劫富济贫
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteJieFuJiPin(gameStore) {
  return function executeJieFuJiPin(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查双方存活城市数量是否>=5
    const getHp = (c) => c.currentHp !== undefined ? c.currentHp : (c.hp || 0)
    const isAlive = (c) => c && c.isAlive !== false && getHp(c) > 0
    const myCities = Object.values(caster.cities).filter(isAlive)
    const targetCities = Object.values(target.cities).filter(isAlive)

    if (myCities.length < TUNE.jieFuJiPin.minCities) {
      return { success: false, message: `${caster.name}的城市数量不足5座（当前${myCities.length}座）` }
    }
    if (targetCities.length < TUNE.jieFuJiPin.minCities) {
      return { success: false, message: `${target.name}的城市数量不足5座（当前${targetCities.length}座）` }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('劫富济贫', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 找出对方HP前三的存活城市
    const targetCitiesArr = Object.values(target.cities)
    const targetTop3 = targetCitiesArr
      .map((c, i) => ({ city: c, index: i, hp: getHp(c) }))
      .filter(item => isAlive(item.city))
      .sort((a, b) => b.hp - a.hp)
      .slice(0, TUNE.jieFuJiPin.topCount)

    // 找出己方HP后三的存活城市
    const myCitiesArr = Object.values(caster.cities)
    const myBottom3 = myCitiesArr
      .map((c, i) => ({ city: c, index: i, hp: getHp(c) }))
      .filter(item => isAlive(item.city))
      .sort((a, b) => a.hp - b.hp)
      .slice(0, TUNE.jieFuJiPin.topCount)

    if (targetTop3.length === 0 || myBottom3.length === 0) {
      return { success: false, message: '没有足够的城市可供选择' }
    }

    // 随机选择一座对方城市和一座己方城市
    const targetCity = targetTop3[Math.floor(Math.random() * targetTop3.length)]
    const myCity = myBottom3[Math.floor(Math.random() * myBottom3.length)]

    // 计算平均HP
    const avgHp = Math.round((targetCity.hp + myCity.hp) / TUNE.jieFuJiPin.averageDivisor)

    // 设置HP（只改 currentHp，保留 hp/max HP）
    targetCity.city.currentHp = avgHp
    myCity.city.currentHp = avgHp

    // 将对手被选中的城市标记为已知（生于紫室城市除外）
    const isTargetPurple = gameStore.purpleChamber && gameStore.purpleChamber[target.name] === targetCity.city.name
    if (!isTargetPurple) {
      gameStore.setCityKnown(target.name, targetCity.city.name, caster.name)
    }
    // 将己方被选中的城市也标记为对手已知（生于紫室城市除外）
    const isMyCityPurple = gameStore.purpleChamber && gameStore.purpleChamber[caster.name] === myCity.city.name
    if (!isMyCityPurple) {
      gameStore.setCityKnown(caster.name, myCity.city.name, target.name)
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '劫富济贫',
      `${caster.name}使用劫富济贫，${target.name}的${targetCity.city.name}（原HP:${Math.round(targetCity.hp)}）与${caster.name}的${myCity.city.name}（原HP:${Math.round(myCity.hp)}）HP取平均，均变为${avgHp}`,
      `${caster.name}使用了劫富济贫`
    )

    return {
      success: true,
      message: `${targetCity.city.name}和${myCity.city.name}的HP均变为${avgHp}`
    }
  }
}

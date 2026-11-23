/**
 * 金币技能：人质交换
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteRenZhiJiaoHuan(gameStore) {
  return function executeRenZhiJiaoHuan(caster, target) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    // 检查双方城市数
    if (Object.keys(caster.cities).length < TUNE.renZhiJiaoHuan.minCities || Object.keys(target.cities).length < TUNE.renZhiJiaoHuan.minCities) {
      return {
        success: false,
        message: '双方城市数都需要≥4才能使用人质交换'
      }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '人质交换')) {
      addSkillUsageLog(
        gameStore,
        caster.name,
        '人质交换',
        `${caster.name}使用人质交换，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了人质交换`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 获取所有存活城市，按当前HP排序（降序）
    const mySorted = Object.keys(caster.cities)
      .filter(cityName => {
        const city = caster.cities[cityName]
        return city && (city.currentHp ?? city.hp) > 0 && city.isAlive !== false
      })
      .map(cityName => ({
        cityName,
        hp: (caster.cities[cityName].currentHp ?? caster.cities[cityName].hp)
      }))
      .sort((a, b) => b.hp - a.hp)

    const oppSorted = Object.keys(target.cities)
      .filter(cityName => {
        const city = target.cities[cityName]
        return city && (city.currentHp ?? city.hp) > 0 && city.isAlive !== false
      })
      .map(cityName => ({
        cityName,
        hp: (target.cities[cityName].currentHp ?? target.cities[cityName].hp)
      }))
      .sort((a, b) => b.hp - a.hp)

    if (mySorted.length < TUNE.renZhiJiaoHuan.minCities) {
      return {
        success: false,
        message: `你的存活城市不足4个（当前${mySorted.length}个）`
      }
    }

    if (oppSorted.length < TUNE.renZhiJiaoHuan.minOppCities) {
      return {
        success: false,
        message: `对方的存活城市不足3个（当前${oppSorted.length}个）`
      }
    }

    // 我方选择当前HP第4的城市
    const myCityName = mySorted[TUNE.renZhiJiaoHuan.myCityIndex].cityName

    // 对方选择当前HP第3的城市
    const oppCityName = oppSorted[TUNE.renZhiJiaoHuan.oppCityIndex].cityName

    // 检查谨慎交换集合（定海神针、钢铁城市、中心城市等）
    if (gameStore.isInCautiousSet(caster.name, myCityName) || gameStore.isInCautiousSet(target.name, oppCityName)) {
      return {
        success: false,
        message: '可交换的城市位于谨慎交换集合，无法使用人质交换'
      }
    }

    // 金币检查和扣除（放在谨慎交换集合检查之后，确保技能可以成功再扣金币）
    const goldCheck = checkAndDeductGold('人质交换', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 返回准备数据，等待弹窗确认
    return {
      success: true,
      isPending: true,
      casterCities: [myCityName],
      targetCities: [oppCityName],
      message: `人质交换准备完成，等待对手响应`
    }
  }
}

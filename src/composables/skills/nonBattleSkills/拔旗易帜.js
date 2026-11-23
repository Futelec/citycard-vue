/**
 * 金币技能：拔旗易帜
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteBaQiYiZhi(gameStore) {
  return function executeBaQiYiZhi(caster, target, params) {
    const { myCityName, oppCityName } = params

    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    if (myCityName === undefined || oppCityName === undefined) {
      return { success: false, message: '未选择城市' }
    }

    // 辅助函数：获取城市的有效省份（考虑拔旗易帜）
    const getEffectiveProvince = (player, cityKey) => {
      if (gameStore.changeFlagMark &&
          gameStore.changeFlagMark[player.name] &&
          gameStore.changeFlagMark[player.name][cityKey]) {
        return gameStore.changeFlagMark[player.name][cityKey].newProvince
      }
      const city = player.cities[cityKey]
      return city ? (city.province || PROVINCE_MAP[city.name]?.name) : null
    }

    const myCity = caster.cities[myCityName]
    const oppCity = target.cities[oppCityName]

    if (!myCity || !oppCity) {
      return { success: false, message: '城市不存在' }
    }

    if (myCity.currentHp <= 0 || myCity.isAlive === false) {
      return { success: false, message: '己方城市已阵亡' }
    }

    if (oppCity.currentHp <= 0 || oppCity.isAlive === false) {
      return { success: false, message: '对方城市已阵亡' }
    }

    const myProv = getEffectiveProvince(caster, myCityName)
    const oppProv = getEffectiveProvince(target, oppCityName)

    if (!myProv || !oppProv) {
      return { success: false, message: '无法获取城市省份信息' }
    }

    // 检查是否是省会
    if (isCapitalCity(myCity.name, myProv)) {
      return { success: false, message: '己方城市是省会，无法使用拔旗易帜' }
    }

    if (isCapitalCity(oppCity.name, oppProv)) {
      return { success: false, message: '对方城市是省会，无法使用拔旗易帜' }
    }

    // 检查是否是直辖市和特区
    if (myProv === '直辖市和特区') {
      return { success: false, message: '己方城市属于直辖市和特区，无法使用拔旗易帜' }
    }

    if (oppProv === '直辖市和特区') {
      return { success: false, message: '对方城市属于直辖市和特区，无法使用拔旗易帜' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('拔旗易帜', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, oppCityName)) {
      addSkillUsageLog(gameStore, caster.name, '拔旗易帜',
        `${caster.name}使用了拔旗易帜，但对手目标是副中心城市，技能无效`,
        `${caster.name}使用了拔旗易帜`)
      return { success: true, message: '对手目标是副中心城市，技能无效，金币不返还' }
    }

    // 初始化changeFlagMark结构
    if (!gameStore.changeFlagMark) {
      gameStore.changeFlagMark = {}
    }
    if (!gameStore.changeFlagMark[caster.name]) {
      gameStore.changeFlagMark[caster.name] = {}
    }
    if (!gameStore.changeFlagMark[target.name]) {
      gameStore.changeFlagMark[target.name] = {}
    }

    // 交换省份归属
    gameStore.changeFlagMark[caster.name][myCityName] = {
      newProvince: oppProv,
      originalProvince: myProv
    }

    gameStore.changeFlagMark[target.name][oppCityName] = {
      newProvince: myProv,
      originalProvince: oppProv
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了拔旗易帜',
      `${caster.name}对${target.name}使用了拔旗易帜，交换了${myCity.name}（${myProv}→${oppProv}）和${oppCity.name}（${oppProv}→${myProv}）的省份归属`,
      `${caster.name}使用了了拔旗易帜`
    )

    return {
      success: true,
      message: `成功交换省份归属：${myCity.name}（${myProv}→${oppProv}）和${oppCity.name}（${oppProv}→${myProv}）`,
      data: {
        myCityName: myCity.name,
        oppCityName: oppCity.name,
        myProvChange: { from: myProv, to: oppProv },
        oppProvChange: { from: oppProv, to: myProv }
      }
    }
  }
}

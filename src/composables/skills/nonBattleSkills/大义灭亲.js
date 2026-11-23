/**
 * 金币技能：大义灭亲
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteDaYiMieQin(gameStore) {
  return function executeDaYiMieQin(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    const myCityName = selfCity.name
    if (!caster.cities[myCityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    if (selfCity.currentHp <= 0 || selfCity.isAlive === false) {
      return { success: false, message: '己方城市已阵亡' }
    }

    // 获取有效省份（考虑拔旗易帜）
    let myProv
    if (gameStore.changeFlagMark &&
        gameStore.changeFlagMark[caster.name] &&
        gameStore.changeFlagMark[caster.name][myCityName]) {
      myProv = gameStore.changeFlagMark[caster.name][myCityName].newProvince
    } else {
      myProv = selfCity.province || PROVINCE_MAP[selfCity.name]?.name
    }

    // 检查是否是直辖市/特别行政区
    if (myProv === '北京市' || myProv === '上海市' || myProv === '天津市' || myProv === '重庆市' ||
        myProv === '香港特别行政区' || myProv === '澳门特别行政区' || myProv === '直辖市和特区') {
      return {
        success: false,
        message: '无法对直辖市和特别行政区的城市使用大义灭亲'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('大义灭亲', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    const mode = gameStore.gameMode || '2P'
    let destroyLog = []
    let protectLog = []
    let totalDestroyed = 0

    // 遍历所有对手玩家
    gameStore.players.forEach(opp => {
      if (opp.name === caster.name) return

      // 在2v2模式下，跳过队友
      if (mode === '2v2' && opp.team === caster.team) return

      // 检查坚不可摧护盾
      if (gameStore.isBlockedByJianbukecui(opp.name, caster.name, '大义灭亲')) {
        // 双日志
        addSkillUsageLog(
          gameStore,
          caster.name,
          '大义灭亲',
          `${caster.name}对${opp.name}使用了大义灭亲，但被坚不可摧护盾阻挡`,
          `${caster.name}使用了大义灭亲`
        )
        return // 跳过该对手
      }

      Object.entries(opp.cities).forEach(([cityKey, oppCity]) => {
        if (!oppCity || oppCity.currentHp <= 0 || oppCity.isAlive === false) return

        // 获取有效省份（考虑拔旗易帜）
        let oppProv
        if (gameStore.changeFlagMark &&
            gameStore.changeFlagMark[opp.name] &&
            gameStore.changeFlagMark[opp.name][cityKey]) {
          oppProv = gameStore.changeFlagMark[opp.name][cityKey].newProvince
        } else {
          oppProv = oppCity.province || PROVINCE_MAP[oppCity.name]?.name
        }

        // 同省且非直辖市/特区
        if (oppProv === myProv) {
          // 检查是否是直辖市或特区城市
          const province = gameStore.getProvinceOfCity(oppCity.name)
          const provinceName = province ? province.name : null
          if (provinceName === '直辖市和特区') {
            return // 跳过直辖市和特区城市
          }

          // 检查是否是中心城市（2P/2v2模式）
          if ((mode === '2P' || mode === '2v2') && cityKey === opp.centerCityName) {
            return // 跳过中心城市
          }

          // 跳过副中心城市（免疫效果）
          if (gameStore.isSubCenter(opp.name, cityKey)) return

          // 检查保护和铁城
          let hasProtection = false

          // 检查保护罩
          if (gameStore.protections && gameStore.protections[opp.name] &&
              gameStore.protections[opp.name][cityKey] && gameStore.protections[opp.name][cityKey] > 0) {
            gameStore.protections[opp.name][cityKey] -= 1
            protectLog.push(`${opp.name}的${oppCity.name}保护层数-1（剩余${gameStore.protections[opp.name][cityKey]}）`)
            hasProtection = true
          }
          // 检查铁城
          else if (gameStore.ironCities && gameStore.ironCities[opp.name] &&
                   gameStore.ironCities[opp.name][cityKey]) {
            delete gameStore.ironCities[opp.name][cityKey]
            protectLog.push(`${opp.name}的${oppCity.name}铁城状态被移除`)
            hasProtection = true
          }

          // 如果没有保护，则将HP设为0
          if (!hasProtection) {
            oppCity.currentHp = 0
            oppCity.isAlive = false
            if (!gameStore.deadCities[opp.name]) {
              gameStore.deadCities[opp.name] = []
            }
            if (!gameStore.deadCities[opp.name].includes(cityKey)) {
              gameStore.deadCities[opp.name].push(cityKey)
            }
            destroyLog.push(`${opp.name}的${oppCity.name}`)
            totalDestroyed++
          }
        }
      })
    })

    // 日志记录
    if (protectLog.length > 0) {
      protectLog.forEach(log => addSkillEffectLog(gameStore, log))

    }

    if (destroyLog.length > 0) {
      // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了大义灭亲（${myProv}）',
      `${caster.name}使用了大义灭亲（${myProv}），阵亡城市：${destroyLog.join('、')}`,
      `${caster.name}使用了了大义灭亲（${myProv}）`
    )
    } else {
      // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了大义灭亲（${myProv}）',
      `${caster.name}使用了大义灭亲（${myProv}），但没有城市受影响`,
      `${caster.name}使用了了大义灭亲（${myProv}）`
    )
    }

    return {
      success: true,
      message: `${totalDestroyed}个同省对手城市阵亡`,
      data: {
        province: myProv,
        destroyed: destroyLog,
        protected: protectLog
      }
    }
  }
}

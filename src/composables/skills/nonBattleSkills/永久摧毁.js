/**
 * 金币技能：永久摧毁
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteYongJiuCuiHui(gameStore) {
  return function executeYongJiuCuiHui(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    if (targetCity.isCenter) {
      return { success: false, message: '无法对中心城市使用' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '灰飞烟灭')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '灰飞烟灭',
        `${caster.name}使用灰飞烟灭，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了灰飞烟灭`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 检查是否为直辖市或特别行政区（12金币）
    const municipalities = ['北京市', '上海市', '天津市', '重庆市', '香港特别行政区', '澳门特别行政区']
    const isMunicipality = municipalities.includes(targetCity.name)
    const requiredGold = isMunicipality ? TUNE.yongJiuCuiHui.municipalityGold : TUNE.yongJiuCuiHui.normalGold

    // 手动金币检查和扣除（因为skillCosts中是9金币）
    if (caster.gold < requiredGold) {
      return {
        success: false,
        message: `金币不足（需要${requiredGold}，当前${caster.gold}）`
      }
    }
    caster.gold -= requiredGold

    // 获取城市键名
    const cityName = targetCity.name

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, cityName)) {
      addSkillUsageLog(gameStore, caster.name, '灰飞烟灭',
        `${caster.name}使用了灰飞烟灭，但目标是副中心城市，技能无效`,
        `${caster.name}使用了灰飞烟灭`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 检查并消耗保护罩/钢铁护盾
    if (gameStore.consumeProtection(target.name, cityName)) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '灰飞烟灭',
        `${caster.name}的灰飞烟灭击破了${target.name}的城市护盾${isMunicipality ? '（直辖市/特区，花费12金币）' : ''}`,
        `${caster.name}的灰飞烟灭击破了${target.name}的${targetCity.name}护盾`
      )
      return {
        success: true,
        message: `击破了${targetCity.name}的护盾`
      }
    }

    // 步步高升触发：灰飞烟灭摧毁城市前，检查并触发步步高升召唤
    let bbgsSummoned = false
    if (gameStore.bbgs && gameStore.bbgs[target.name] && gameStore.bbgs[target.name][cityName]) {
      // 模拟城市阵亡以触发步步高升
      gameStore.handleBuBuGaoShengSummon(target, cityName, targetCity)
      bbgsSummoned = true
    }

    // 从列表中删除
    delete target.cities[cityName]

    // 从deadCities中移除（如果存在）
    if (gameStore.deadCities[target.name]) {
      const deadIdx = gameStore.deadCities[target.name].indexOf(cityName)
      if (deadIdx > -1) {
        gameStore.deadCities[target.name].splice(deadIdx, 1)
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '灰飞烟灭',
      `${caster.name}灰飞烟灭了${target.name}的城市${isMunicipality ? '（直辖市/特区，花费12金币）' : ''}，冷却5回合`,
      `${caster.name}灰飞烟灭了${target.name}的${targetCity.name}，冷却5回合`
    )

    return {
      success: true,
      message: `${targetCity.name}已被灰飞烟灭${bbgsSummoned ? '（步步高升已触发召唤）' : ''}`
    }
  }
}

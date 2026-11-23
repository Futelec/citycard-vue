/**
 * 金币技能：血量存储
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteXueLiangCunChu(gameStore) {
  return function executeXueLiangCunChu(caster, selfCity, operation, amount) {
    // 初始化存储库
    if (!gameStore.hpBank) {
      gameStore.hpBank = {}
    }
    if (!gameStore.hpBank[caster.name]) {
      gameStore.hpBank[caster.name] = {
        balance: 0,
        depositMade: false,
        hasWithdrawnThisRound: false
      }
    }

    const bankData = gameStore.hpBank[caster.name]

    // 操作类型：deposit（存款）或 withdraw（取款）
    if (operation === 'deposit') {
      if (bankData.depositMade) {
        return { success: false, message: '已经完成过储值，无法重复储值！（每局限1次）' }
      }

      if (!selfCity) {
        return { success: false, message: '未选择城市' }
      }

      const currentHp = selfCity.currentHp || selfCity.hp
      if (currentHp <= TUNE.xueLiangCunChu.minDepositHp) {
        return { success: false, message: 'HP必须大于10000才能储值！' }
      }

      // 检查存款金额（至少10000）
      if (!amount || amount < TUNE.xueLiangCunChu.minDepositHp) {
        return { success: false, message: '存款金额至少10000HP！' }
      }

      if (amount > currentHp) {
        return { success: false, message: `城市HP不足（当前${Math.floor(currentHp)}，需要${amount}）` }
      }

      // 金币检查和扣除
      const goldCheck = checkAndDeductGold('血量存储', caster, gameStore)
      if (!goldCheck.success) {
        return goldCheck
      }

      // 扣除指定HP并储值
      selfCity.currentHp = (selfCity.currentHp || selfCity.hp) - amount
      bankData.balance = amount
      bankData.depositMade = true

      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '血量存储',
        `${caster.name}使用血量存储，${selfCity.name}扣除${amount}HP并储值到存储库（每局限1次）`,
        `${caster.name}使用了血量存储`
      )

      return {
        success: true,
        message: `成功储值${amount}HP到存储库，${selfCity.name}当前HP：${Math.floor(selfCity.currentHp)}`
      }
    } else if (operation === 'withdraw') {
      if (!bankData.depositMade) {
        return { success: false, message: '尚未完成储值，无法提取！' }
      }

      if (bankData.hasWithdrawnThisRound) {
        return { success: false, message: '本回合已经提取过，每回合只能提取一次！' }
      }

      // 检查余额是否低于2000（自动销毁）
      if (bankData.balance < TUNE.xueLiangCunChu.balanceDestroyThreshold) {
        delete gameStore.hpBank[caster.name]
        return { success: false, message: '存储库余额低于2000，已自动销毁！' }
      }

      if (!selfCity) {
        return { success: false, message: '未选择城市' }
      }

      if (selfCity.currentHp <= 0 || selfCity.isAlive === false) {
        return { success: false, message: '该城市已阵亡，无法提取HP！' }
      }

      // 检查提取金额（不少于2000）
      if (!amount || amount < TUNE.xueLiangCunChu.balanceDestroyThreshold) {
        return { success: false, message: '提取金额不少于2000HP！' }
      }

      if (amount > bankData.balance) {
        return { success: false, message: `存储库余额不足（当前${Math.floor(bankData.balance)}，需要${amount}）` }
      }

      // 提取需要1金币
      if (caster.gold < HP_BANK_WITHDRAW_COST) {
        return { success: false, message: '金币不足，提取需要1金币！' }
      }
      caster.gold -= HP_BANK_WITHDRAW_COST

      // 提取指定HP
      selfCity.currentHp = (selfCity.currentHp || selfCity.hp) + amount
      bankData.balance -= amount
      bankData.hasWithdrawnThisRound = true

      addSkillEffectLog(gameStore, `${caster.name}花费1金币从存储库提取${amount}HP到${selfCity.name}，剩余余额：${Math.floor(bankData.balance)}`)

      // 检查提取后余额是否低于2000（自动销毁）
      if (bankData.balance < TUNE.xueLiangCunChu.balanceDestroyThreshold) {
        delete gameStore.hpBank[caster.name]
        addSkillEffectLog(gameStore, `${caster.name}的存储库余额低于2000，已自动销毁`)

      }

      return {
        success: true,
        message: `成功提取${amount}HP（花费1金币），存储库剩余：${Math.floor(bankData.balance)}`,
        data: {
          withdrawn: amount,
          remaining: bankData.balance
        }
      }
    } else if (operation === 'applyInterest') {
      // 利息计算（每回合自动调用）
      if (!bankData.depositMade || bankData.balance <= 0) {
        return { success: true, message: '无活跃存储库' }
      }

      let interestRate = 0
      if (bankData.balance < TUNE.xueLiangCunChu.interestTier1Threshold) {
        interestRate = TUNE.xueLiangCunChu.interestRate1  // 10%
      } else if (bankData.balance < TUNE.xueLiangCunChu.interestTier2Threshold) {
        interestRate = TUNE.xueLiangCunChu.interestRate2  // 5%
      } else {
        interestRate = TUNE.xueLiangCunChu.interestRate3  // 1%
      }

      const interest = Math.floor(bankData.balance * interestRate)
      bankData.balance += interest

      addSkillEffectLog(gameStore, `${caster.name}的存储库获得${interest}HP利息（利率${(interestRate * 100).toFixed(0)}%），当前余额：${Math.floor(bankData.balance)}`)


      return {
        success: true,
        message: `获得${interest}HP利息`,
        data: {
          interest: interest,
          balance: bankData.balance
        }
      }
    }

    return { success: false, message: '未知操作类型' }
  }
}

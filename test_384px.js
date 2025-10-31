// 在浏览器控制台运行此脚本来测试384px下的布局

console.log('\n========================================');
console.log('  384px 布局完整诊断');
console.log('========================================\n');

// 1. 窗口信息
console.log('📏 窗口尺寸:');
console.log('  宽度:', window.innerWidth, 'px');
console.log('  高度:', window.innerHeight, 'px');

// 2. 容器信息
const grid = document.querySelector('.posts-grid');
if (grid) {
  console.log('\n📦 容器信息:');
  console.log('  存在:', '✅');
  console.log('  宽度:', grid.offsetWidth, 'px');
  console.log('  高度:', grid.offsetHeight, 'px');
  
  const gridStyle = window.getComputedStyle(grid);
  console.log('  position:', gridStyle.position);
} else {
  console.log('\n❌ 未找到 .posts-grid 容器');
}

// 3. 卡片信息
const cards = document.querySelectorAll('a.post-card');
console.log('\n🃏 卡片信息:');
console.log('  数量:', cards.length);

if (cards.length >= 2) {
  // 检查前两个卡片
  for (let i = 0; i < Math.min(2, cards.length); i++) {
    const card = cards[i];
    const style = window.getComputedStyle(card);
    
    console.log(`\n  卡片 ${i + 1}:`);
    console.log('    width:', style.width);
    console.log('    height:', style.height);
    console.log('    position:', style.position);
    console.log('    display:', style.display);
    console.log('    left:', style.left);
    console.log('    top:', style.top);
    console.log('    margin-bottom:', style.marginBottom);
  }
  
  // 4. 布局分析
  const style1 = window.getComputedStyle(cards[0]);
  const style2 = window.getComputedStyle(cards[1]);
  
  console.log('\n🔍 布局分析:');
  
  if (style1.position === 'absolute' && style2.position === 'absolute') {
    console.log('  Masonry状态: ✅ 已激活');
    console.log('  第一列位置:', style1.left);
    console.log('  第二列位置:', style2.left);
    
    // 计算gutter
    const left1 = parseFloat(style1.left);
    const left2 = parseFloat(style2.left);
    const width1 = parseFloat(style1.width);
    
    if (!isNaN(left1) && !isNaN(left2) && !isNaN(width1)) {
      const calculatedGutter = left2 - left1 - width1;
      console.log('  计算的gutter:', Math.round(calculatedGutter), 'px');
      
      if (window.innerWidth <= 480) {
        console.log('  预期gutter: 12px');
        if (Math.abs(calculatedGutter - 12) < 1) {
          console.log('  状态: ✅ 正确');
        } else {
          console.log('  状态: ❌ 不匹配 (应该是12px)');
        }
      } else {
        console.log('  预期gutter: 16px');
      }
    }
  } else {
    console.log('  Masonry状态: ❌ 未激活');
    console.log('  position:', style1.position);
    console.log('  这意味着Masonry没有应用绝对定位');
    console.log('\n  💡 解决方案:');
    console.log('  1. 刷新页面 (Ctrl+Shift+R)');
    console.log('  2. 调整窗口大小触发resize');
    console.log('  3. 检查控制台是否有Masonry初始化日志');
  }
  
  // 5. 理论计算
  console.log('\n📐 理论计算 (窗口宽度 ' + window.innerWidth + 'px):');
  const containerWidth = grid ? grid.offsetWidth : window.innerWidth - 32; // 假设有padding
  const expectedGutter = window.innerWidth <= 480 ? 12 : 16;
  const expectedCardWidth = (containerWidth - expectedGutter) / 2;
  
  console.log('  容器宽度:', containerWidth, 'px');
  console.log('  预期gutter:', expectedGutter, 'px');
  console.log('  预期卡片宽度:', Math.round(expectedCardWidth), 'px');
  console.log('  实际卡片宽度:', style1.width);
  
  const actualWidth = parseFloat(style1.width);
  if (Math.abs(actualWidth - expectedCardWidth) < 5) {
    console.log('  宽度匹配: ✅');
  } else {
    console.log('  宽度匹配: ⚠️ 可能有偏差');
  }
} else {
  console.log('  ❌ 卡片数量不足，无法测试');
}

// 6. 检查Masonry实例
console.log('\n🔧 Masonry实例:');
if (grid && grid.__masonry) {
  console.log('  存在: ✅');
} else {
  console.log('  存在: ❌');
  console.log('  这意味着Masonry可能没有正确初始化');
}

console.log('\n========================================');
console.log('  诊断完成');
console.log('========================================\n');

// 返回简要结果
const summary = {
  windowWidth: window.innerWidth,
  cardsCount: cards.length,
  masonryActive: cards.length >= 2 && 
                 window.getComputedStyle(cards[0]).position === 'absolute',
  firstCardLeft: cards.length >= 1 ? window.getComputedStyle(cards[0]).left : 'N/A',
  secondCardLeft: cards.length >= 2 ? window.getComputedStyle(cards[1]).left : 'N/A'
};

console.log('📊 快速摘要:', summary);

if (!summary.masonryActive) {
  console.log('\n⚠️ Masonry未激活! 请尝试:');
  console.log('   1. 强制刷新页面 (Ctrl+Shift+R)');
  console.log('   2. 调整窗口大小然后再调回384px');
  console.log('   3. 查看控制台中的 [Masonry] 日志');
}

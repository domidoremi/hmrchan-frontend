// Masonry诊断脚本 - 在浏览器控制台运行

console.log('=== Masonry 诊断 ===\n');

// 1. 检查容器
const grid = document.querySelector('.posts-grid');
if (!grid) {
  console.error('❌ 未找到 .posts-grid 容器');
} else {
  console.log('✅ 找到 .posts-grid 容器');
  console.log('   容器宽度:', grid.offsetWidth, 'px');
}

// 2. 检查卡片
const cards = document.querySelectorAll('a.post-card, .post-card');
console.log(`\n📦 找到 ${cards.length} 个卡片`);

if (cards.length > 0) {
  // 检查前3个卡片
  cards.forEach((card, index) => {
    if (index < 3) {
      const style = window.getComputedStyle(card);
      console.log(`\n卡片 ${index + 1}:`);
      console.log('  width:', style.width);
      console.log('  position:', style.position);
      console.log('  left:', style.left);
      console.log('  top:', style.top);
    }
  });
}

// 3. 检查Masonry实例
if (grid && grid.__masonry) {
  console.log('\n✅ Masonry 实例存在');
} else {
  console.log('\n❌ Masonry 实例不存在');
}

// 4. 检查CSS
const firstCard = cards[0];
if (firstCard) {
  const style = window.getComputedStyle(firstCard);
  console.log('\n🎨 第一个卡片CSS:');
  console.log('  width:', style.width);
  console.log('  display:', style.display);
  console.log('  margin-bottom:', style.marginBottom);
}

console.log('\n窗口宽度:', window.innerWidth, 'px');

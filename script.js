// 数据存储键名
const STORAGE_KEYS = {
    CLASSMATES: 'classmates_data',
    REWARDS: 'rewards_data',
    PUNISHMENTS: 'punishments_data',
    STUDENT_COUNTS: 'student_counts'
};

// 当前登录用户信息
let currentUser = null;
let currentUserType = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 自动加载根目录下的 classmates.json
    autoLoadClassmatesJson();
    
    // 加载已存储的班级名单
    loadClassmatesFromStorage();
    
    // 监听用户类型切换
    document.getElementById('userType').addEventListener('change', function() {
        const userType = this.value;
        const studentLogin = document.getElementById('studentLogin');
        const studentIdGroup = document.getElementById('studentIdGroup');
        const teacherLogin = document.getElementById('teacherLogin');
        const teacherPasswordGroup = document.getElementById('teacherPasswordGroup');
        
        if (userType === 'student') {
            studentLogin.style.display = 'block';
            studentIdGroup.style.display = 'block';
            teacherLogin.style.display = 'none';
            teacherPasswordGroup.style.display = 'none';
        } else {
            studentLogin.style.display = 'none';
            studentIdGroup.style.display = 'none';
            teacherLogin.style.display = 'block';
            teacherPasswordGroup.style.display = 'block';
        }
    });

    // 监听文件上传
    document.getElementById('classmatesFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                parseClassmatesFile(content);
            };
            reader.readAsText(file);
        }
    });

    // 检查是否已登录
    checkLoginStatus();
});

// 自动加载根目录下的 classmates.json
async function autoLoadClassmatesJson() {
    try {
        const response = await fetch('classmates.json');
        if (response.ok) {
            const jsonData = await response.json();
            parseClassmatesJson(jsonData);
        } else {
            // 文件不存在，静默失败，使用已存储的数据或等待用户上传
            console.log('未找到 classmates.json 文件，请手动上传班级名单');
        }
    } catch (error) {
        // 网络错误或文件不存在，静默失败
        console.log('自动加载 classmates.json 失败，请手动上传班级名单');
    }
}

// 解析班级名单JSON格式
function parseClassmatesJson(jsonData) {
    let classmates = [];
    
    // 支持两种JSON格式：
    // 1. 数组格式：[{"name": "张三", "id": "2021001"}, ...]
    // 2. 对象格式：{"students": [{"name": "张三", "id": "2021001"}, ...]}
    if (Array.isArray(jsonData)) {
        classmates = jsonData;
    } else if (jsonData.students && Array.isArray(jsonData.students)) {
        classmates = jsonData.students;
    } else if (jsonData.classmates && Array.isArray(jsonData.classmates)) {
        classmates = jsonData.classmates;
    }
    
    // 验证并格式化数据
    const validClassmates = classmates.filter(item => {
        return item && item.name && (item.id || item.studentId || item.student_id);
    }).map(item => ({
        name: item.name,
        id: item.id || item.studentId || item.student_id
    }));
    
    if (validClassmates.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CLASSMATES, JSON.stringify(validClassmates));
        console.log('班级名单自动加载成功！共 ' + validClassmates.length + ' 名学生');
    }
}

// 解析班级名单文件（支持TXT和JSON格式）
function parseClassmatesFile(content) {
    // 尝试解析为JSON
    try {
        const jsonData = JSON.parse(content);
        parseClassmatesJson(jsonData);
        return;
    } catch (e) {
        // 不是JSON格式，按TXT格式处理
    }
    
    // 按TXT格式解析（原有逻辑）
    const lines = content.split('\n').filter(line => line.trim());
    const classmates = [];
    
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            classmates.push({
                name: parts[0],
                id: parts[1]
            });
        }
    });
    
    if (classmates.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CLASSMATES, JSON.stringify(classmates));
        alert('班级名单加载成功！共 ' + classmates.length + ' 名学生');
    }
}

// 从存储加载班级名单
function loadClassmatesFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEYS.CLASSMATES);
    if (stored) {
        return JSON.parse(stored);
    }
    return [];
}

// 处理登录
function handleLogin() {
    const userType = document.getElementById('userType').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';

    if (userType === 'student') {
        const name = document.getElementById('studentName').value.trim();
        const id = document.getElementById('studentId').value.trim();
        
        if (!name || !id) {
            showError('请输入姓名和学号');
            return;
        }
        
        const classmates = loadClassmatesFromStorage();
        if (classmates.length === 0) {
            showError('请先上传班级名单文件');
            return;
        }
        
        const student = classmates.find(s => s.name === name && s.id === id);
        if (!student) {
            showError('姓名或学号不正确，请确认后重试');
            return;
        }
        
        currentUser = { name, id };
        currentUserType = 'student';
        showStudentPage();
        
    } else {
        const account = document.getElementById('teacherAccount').value.trim();
        const password = document.getElementById('teacherPassword').value.trim();
        
        if (account !== 'admin' || password !== '123456') {
            showError('账号或密码错误');
            return;
        }
        
        currentUser = { account: 'admin' };
        currentUserType = 'teacher';
        showTeacherPage();
    }
}

// 显示错误信息
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

// 显示学生页面
function showStudentPage() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('studentPage').classList.add('active');
    document.getElementById('teacherPage').classList.remove('active');
    
    document.getElementById('studentDisplayName').textContent = currentUser.name;
    updateStudentCounts();
    loadStudentSubmittedContent();
    updateRemainingCounts();
}

// 显示老师页面
function showTeacherPage() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('studentPage').classList.remove('active');
    document.getElementById('teacherPage').classList.add('active');
    
    updateStats();
    updateRemainingCounts();
}

// 更新学生剩余填写次数
function updateStudentCounts() {
    const counts = getStudentCounts();
    const studentKey = `${currentUser.name}_${currentUser.id}`;
    const userCounts = counts[studentKey] || { reward: 1, punishment: 1 };
    
    document.getElementById('studentRewardCount').textContent = userCounts.reward;
    document.getElementById('studentPunishmentCount').textContent = userCounts.punishment;
    
    // 更新按钮状态
    const rewardBtn = document.getElementById('submitRewardBtn');
    const punishmentBtn = document.getElementById('submitPunishmentBtn');
    
    if (userCounts.reward <= 0) {
        rewardBtn.disabled = true;
        rewardBtn.textContent = '已填写';
    } else {
        rewardBtn.disabled = false;
        rewardBtn.textContent = '提交奖励';
    }
    
    if (userCounts.punishment <= 0) {
        punishmentBtn.disabled = true;
        punishmentBtn.textContent = '已填写';
    } else {
        punishmentBtn.disabled = false;
        punishmentBtn.textContent = '提交惩罚';
    }
}

// 获取学生填写次数
function getStudentCounts() {
    const stored = localStorage.getItem(STORAGE_KEYS.STUDENT_COUNTS);
    return stored ? JSON.parse(stored) : {};
}

// 保存学生填写次数
function saveStudentCounts(counts) {
    localStorage.setItem(STORAGE_KEYS.STUDENT_COUNTS, JSON.stringify(counts));
}

// 学生提交奖励
function submitStudentReward() {
    const content = document.getElementById('studentReward').value.trim();
    if (!content) {
        showMessage('rewardMessage', '请输入奖励内容', 'error');
        return;
    }
    
    const counts = getStudentCounts();
    const studentKey = `${currentUser.name}_${currentUser.id}`;
    const userCounts = counts[studentKey] || { reward: 1, punishment: 1 };
    
    if (userCounts.reward <= 0) {
        showMessage('rewardMessage', '您已经填写过奖励了', 'error');
        return;
    }
    
    // 保存奖励
    const rewards = getRewards();
    rewards.push({
        content: content,
        filler: currentUser.name,
        id: Date.now()
    });
    saveRewards(rewards);
    
    // 减少次数
    userCounts.reward--;
    counts[studentKey] = userCounts;
    saveStudentCounts(counts);
    
    showMessage('rewardMessage', '奖励提交成功！', 'success');
    document.getElementById('studentReward').value = '';
    updateStudentCounts();
    updateRemainingCounts();
}

// 学生提交惩罚
function submitStudentPunishment() {
    const content = document.getElementById('studentPunishment').value.trim();
    if (!content) {
        showMessage('punishmentMessage', '请输入惩罚内容', 'error');
        return;
    }
    
    const counts = getStudentCounts();
    const studentKey = `${currentUser.name}_${currentUser.id}`;
    const userCounts = counts[studentKey] || { reward: 1, punishment: 1 };
    
    if (userCounts.punishment <= 0) {
        showMessage('punishmentMessage', '您已经填写过惩罚了', 'error');
        return;
    }
    
    // 保存惩罚
    const punishments = getPunishments();
    punishments.push({
        content: content,
        filler: currentUser.name,
        id: Date.now()
    });
    savePunishments(punishments);
    
    // 减少次数
    userCounts.punishment--;
    counts[studentKey] = userCounts;
    saveStudentCounts(counts);
    
    showMessage('punishmentMessage', '惩罚提交成功！', 'success');
    document.getElementById('studentPunishment').value = '';
    updateStudentCounts();
    updateRemainingCounts();
}

// 加载学生已提交的内容
function loadStudentSubmittedContent() {
    const rewards = getRewards();
    const punishments = getPunishments();
    const studentReward = rewards.find(r => r.filler === currentUser.name);
    const studentPunishment = punishments.find(p => p.filler === currentUser.name);
    
    if (studentReward) {
        document.getElementById('studentReward').value = studentReward.content;
    }
    if (studentPunishment) {
        document.getElementById('studentPunishment').value = studentPunishment.content;
    }
}

// 获取奖励列表
function getRewards() {
    const stored = localStorage.getItem(STORAGE_KEYS.REWARDS);
    return stored ? JSON.parse(stored) : [];
}

// 保存奖励列表
function saveRewards(rewards) {
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
}

// 获取惩罚列表
function getPunishments() {
    const stored = localStorage.getItem(STORAGE_KEYS.PUNISHMENTS);
    return stored ? JSON.parse(stored) : [];
}

// 保存惩罚列表
function savePunishments(punishments) {
    localStorage.setItem(STORAGE_KEYS.PUNISHMENTS, JSON.stringify(punishments));
}

// 显示消息
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type}`;
    setTimeout(() => {
        element.className = 'message';
    }, 3000);
}

// 切换标签页（学生）
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'reward') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('rewardTab').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('punishmentTab').classList.add('active');
    }
}

// 切换标签页（老师）
function switchTeacherTab(tab) {
    document.querySelectorAll('#teacherPage .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#teacherPage .tab-content').forEach(content => content.classList.remove('active'));
    
    const tabs = ['fill', 'draw', 'manage'];
    const tabIndex = tabs.indexOf(tab);
    if (tabIndex !== -1) {
        document.querySelectorAll('#teacherPage .tab-btn')[tabIndex].classList.add('active');
        document.getElementById(tab + 'Tab').classList.add('active');
    }
    
    if (tab === 'manage') {
        updateStats();
        updateRemainingCounts();
    }
    if (tab === 'draw') {
        updateRemainingCounts();
    }
}

// 老师提交内容
function submitTeacherContent() {
    const fillerName = document.getElementById('teacherFillerName').value.trim();
    const contentType = document.getElementById('teacherContentType').value;
    const content = document.getElementById('teacherContent').value.trim();
    
    if (!fillerName || !content) {
        showMessage('teacherFillMessage', '请填写完整信息', 'error');
        return;
    }
    
    if (contentType === 'reward') {
        const rewards = getRewards();
        rewards.push({
            content: content,
            filler: fillerName,
            id: Date.now()
        });
        saveRewards(rewards);
        showMessage('teacherFillMessage', '奖励提交成功！', 'success');
    } else {
        const punishments = getPunishments();
        punishments.push({
            content: content,
            filler: fillerName,
            id: Date.now()
        });
        savePunishments(punishments);
        showMessage('teacherFillMessage', '惩罚提交成功！', 'success');
    }
    
    document.getElementById('teacherFillerName').value = '';
    document.getElementById('teacherContent').value = '';
    updateStats();
    updateRemainingCounts();
}

// 抽奖
let currentDrawItem = null;
let currentDrawType = null;

function drawReward() {
    const rewards = getRewards();
    if (rewards.length === 0) {
        document.getElementById('drawContent').textContent = '暂无奖励可抽取';
        document.getElementById('drawContent').classList.add('empty');
        document.getElementById('confirmBtn').style.display = 'none';
        updateRemainingCounts();
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * rewards.length);
    currentDrawItem = rewards[randomIndex];
    currentDrawType = 'reward';
    
    document.getElementById('drawContent').innerHTML = `
        <div>
            <div style="font-size: 18px; margin-bottom: 15px; opacity: 0.9;">填写人：${currentDrawItem.filler}</div>
            <div style="font-size: 28px; font-weight: bold;">${currentDrawItem.content}</div>
        </div>
    `;
    document.getElementById('drawContent').classList.remove('empty');
    document.getElementById('confirmBtn').style.display = 'block';
    updateRemainingCounts();
}

// 抽罚
function drawPunishment() {
    const punishments = getPunishments();
    if (punishments.length === 0) {
        document.getElementById('drawContent').textContent = '暂无惩罚可抽取';
        document.getElementById('drawContent').classList.add('empty');
        document.getElementById('confirmBtn').style.display = 'none';
        updateRemainingCounts();
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * punishments.length);
    currentDrawItem = punishments[randomIndex];
    currentDrawType = 'punishment';
    
    document.getElementById('drawContent').innerHTML = `
        <div>
            <div style="font-size: 18px; margin-bottom: 15px; opacity: 0.9;">填写人：${currentDrawItem.filler}</div>
            <div style="font-size: 28px; font-weight: bold;">${currentDrawItem.content}</div>
        </div>
    `;
    document.getElementById('drawContent').classList.remove('empty');
    document.getElementById('confirmBtn').style.display = 'block';
    updateRemainingCounts();
}

// 确认抽取结果
function confirmDraw() {
    if (!currentDrawItem || !currentDrawType) return;
    
    if (currentDrawType === 'reward') {
        const rewards = getRewards();
        const newRewards = rewards.filter(r => r.id !== currentDrawItem.id);
        saveRewards(newRewards);
    } else {
        const punishments = getPunishments();
        const newPunishments = punishments.filter(p => p.id !== currentDrawItem.id);
        savePunishments(newPunishments);
    }
    
    document.getElementById('drawContent').textContent = '已确认并销毁';
    document.getElementById('drawContent').classList.add('empty');
    document.getElementById('confirmBtn').style.display = 'none';
    currentDrawItem = null;
    currentDrawType = null;
    updateStats();
    updateRemainingCounts();
}

// 重置所有人的填写次数
function resetAllCounts() {
    const password = document.getElementById('resetPassword').value.trim();
    if (password !== '123456') {
        showMessage('manageMessage', '密码错误', 'error');
        return;
    }
    
    const classmates = loadClassmatesFromStorage();
    const counts = {};
    
    classmates.forEach(student => {
        const key = `${student.name}_${student.id}`;
        counts[key] = { reward: 1, punishment: 1 };
    });
    
    saveStudentCounts(counts);
    showMessage('manageMessage', '所有人的填写次数已重置！', 'success');
    document.getElementById('resetPassword').value = '';
}

// 更新统计信息
function updateStats() {
    const rewards = getRewards();
    const punishments = getPunishments();
    document.getElementById('rewardCount').textContent = rewards.length;
    document.getElementById('punishmentCount').textContent = punishments.length;
}

// 更新剩余数量显示
function updateRemainingCounts() {
    const rewards = getRewards();
    const punishments = getPunishments();
    
    // 更新学生界面
    const studentRewardCountEl = document.getElementById('studentRemainingRewards');
    const studentPunishmentCountEl = document.getElementById('studentRemainingPunishments');
    if (studentRewardCountEl) {
        studentRewardCountEl.textContent = rewards.length;
    }
    if (studentPunishmentCountEl) {
        studentPunishmentCountEl.textContent = punishments.length;
    }
    
    // 更新老师界面
    const teacherRewardCountEl = document.getElementById('teacherRemainingRewards');
    const teacherPunishmentCountEl = document.getElementById('teacherRemainingPunishments');
    if (teacherRewardCountEl) {
        teacherRewardCountEl.textContent = rewards.length;
    }
    if (teacherPunishmentCountEl) {
        teacherPunishmentCountEl.textContent = punishments.length;
    }
}

// 退出登录
function logout() {
    currentUser = null;
    currentUserType = null;
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('studentPage').classList.remove('active');
    document.getElementById('teacherPage').classList.remove('active');
    
    // 清空表单
    document.getElementById('studentName').value = '';
    document.getElementById('studentId').value = '';
    document.getElementById('teacherAccount').value = '';
    document.getElementById('teacherPassword').value = '';
}

// 检查登录状态（用于页面刷新时保持登录）
function checkLoginStatus() {
    // 这里可以添加保持登录状态的逻辑
    // 为了安全，暂时每次都需要重新登录
}

// 从JSON文件批量导入奖励和惩罚
function importFromJson() {
    const fileInput = document.getElementById('importJsonFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('importMessage', '请选择JSON文件', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            let importedRewards = 0;
            let importedPunishments = 0;
            
            // 导入奖励
            if (jsonData.rewards && Array.isArray(jsonData.rewards)) {
                const rewards = getRewards();
                const baseTime = Date.now();
                jsonData.rewards.forEach((item, index) => {
                    if (item.content && item.filler) {
                        rewards.push({
                            content: item.content,
                            filler: item.filler,
                            id: baseTime + index + Math.random() // 确保唯一ID
                        });
                        importedRewards++;
                    }
                });
                saveRewards(rewards);
            }
            
            // 导入惩罚
            if (jsonData.punishments && Array.isArray(jsonData.punishments)) {
                const punishments = getPunishments();
                const baseTime = Date.now();
                jsonData.punishments.forEach((item, index) => {
                    if (item.content && item.filler) {
                        punishments.push({
                            content: item.content,
                            filler: item.filler,
                            id: baseTime + index + Math.random() // 确保唯一ID
                        });
                        importedPunishments++;
                    }
                });
                savePunishments(punishments);
            }
            
            if (importedRewards > 0 || importedPunishments > 0) {
                showMessage('importMessage', 
                    `导入成功！奖励：${importedRewards} 条，惩罚：${importedPunishments} 条`, 
                    'success');
                updateStats();
                updateRemainingCounts();
                fileInput.value = ''; // 清空文件选择
            } else {
                showMessage('importMessage', 'JSON文件格式不正确或没有有效数据', 'error');
            }
        } catch (error) {
            showMessage('importMessage', 'JSON文件解析失败：' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showMessage('importMessage', '文件读取失败', 'error');
    };
    
    reader.readAsText(file);
}


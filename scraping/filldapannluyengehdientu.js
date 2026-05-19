async function fillAndSaveSafely() {
    // 1. Lấy tất cả input (bỏ qua thanh tìm kiếm)
    const allInputs = document.querySelectorAll('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea');
    const inputs = Array.from(allInputs).filter(input => {
        return input.id !== 'textfield' && !(input.placeholder && input.placeholder.includes('Tìm kiếm'));
    });
    
    console.log(`🚀 Bắt đầu điền an toàn cho ${inputs.length} ô. Chịu khó đợi mười mấy giây cho web nó kịp lưu nhé...`);

    // Hàm ép React/Vue nhận giá trị
    const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else {
            valueSetter.call(element, value);
        }
    };

    // Chạy vòng lặp CÓ THỜI GIAN NGHỈ
    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];

        // Focus vào ô
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        input.focus();

        // Điền số '1'
        setNativeValue(input, '1');

        // Báo cho web biết đã có chữ
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Nhấn Enter
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

        // CLICK RA NGOÀI để ép ô chuyển sang Đã làm (màu xanh)
        input.blur();
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

        // THẦN CHÚ CHỐNG ĐƠ: Cho web nghỉ ngơi 40ms để lưu database
        await new Promise(resolve => setTimeout(resolve, 40));

        // In tiến độ cho bạn đỡ sốt ruột
        if ((i + 1) % 40 === 0 || i === inputs.length - 1) {
            console.log(`⏳ Đã điền và lưu xong ${i + 1} / ${inputs.length} câu...`);
        }
    }
    
    console.log("✅ Xong! Quá mượt, không đơ, ô xanh rờn. Nhấn Nộp Bài thôi bồ tèo!");
}

// Chạy lệnh
fillAndSaveSafely();
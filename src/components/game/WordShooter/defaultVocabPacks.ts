import { VocabTopic } from './types';
import { TOEIC_600_MASTER_PACK, TOEIC_THEMATIC_PACKS } from '@/data/toeic600Data';

// Extract the 4 best thematic packs from TOEIC 600
const bizOfficePack = TOEIC_THEMATIC_PACKS.find(p => p.id === 'toeic_biz_office') || {
  id: 'toeic_biz_office',
  name: 'TOEIC: Công Sở & Hợp Đồng',
  icon: '🏢',
  description: 'Hợp đồng, tiếp thị, bảo hành, hội nghị, công nghệ văn phòng và thư tín thương mại.',
  words: []
};

const hrRecruitmentPack = TOEIC_THEMATIC_PACKS.find(p => p.id === 'toeic_hr_recruitment') || {
  id: 'toeic_hr_recruitment',
  name: 'TOEIC: Nhân Sự & Tuyển Dụng',
  icon: '💼',
  description: 'Ứng tuyển việc làm, phỏng vấn, lương bổng, thăng tiến và đãi ngộ nhân sự.',
  words: []
};

const financeBankingPack = TOEIC_THEMATIC_PACKS.find(p => p.id === 'toeic_finance_banking') || {
  id: 'toeic_finance_banking',
  name: 'TOEIC: Tài Chính & Ngân Hàng',
  icon: '📈',
  description: 'Kế toán doanh nghiệp, đầu tư, ngân sách, hóa đơn thuế và báo cáo tài chính.',
  words: []
};

const travelTransportPack = TOEIC_THEMATIC_PACKS.find(p => p.id === 'toeic_travel_transport') || {
  id: 'toeic_travel_transport',
  name: 'TOEIC: Du Lịch & Vận Tải',
  icon: '✈️',
  description: 'Hàng không, khách sạn, vé máy bay, lịch trình di chuyển và đón tiếp đối tác.',
  words: []
};

const dailyLifePack: VocabTopic = {
  id: 'daily',
  name: 'Giao Tiếp & Đời Sống',
  icon: '🗣️',
  description: 'Từ vựng giao tiếp thực tế, phản xạ đàm thoại hàng ngày và sinh hoạt văn phòng.',
  words: [
    { id: 'd1', word: 'welcome', phonetic: '/ˈwel.kəm/', definition_vi: 'chào mừng' },
    { id: 'd2', word: 'friend', phonetic: '/frend/', definition_vi: 'người bạn' },
    { id: 'd3', word: 'family', phonetic: '/ˈfæm.əl.i/', definition_vi: 'gia đình' },
    { id: 'd4', word: 'happy', phonetic: '/ˈhæp.i/', definition_vi: 'hạnh phúc' },
    { id: 'd5', word: 'smile', phonetic: '/smaɪl/', definition_vi: 'nụ cười' },
    { id: 'd6', word: 'morning', phonetic: '/ˈmɔː.nɪŋ/', definition_vi: 'buổi sáng' },
    { id: 'd7', word: 'coffee', phonetic: '/ˈkɒf.i/', definition_vi: 'cà phê' },
    { id: 'd8', word: 'breakfast', phonetic: '/ˈbrek.fəst/', definition_vi: 'bữa sáng' },
    { id: 'd9', word: 'dinner', phonetic: '/ˈdɪn.ər/', definition_vi: 'bữa tối' },
    { id: 'd10', word: 'delicious', phonetic: '/dɪˈlɪʃ.əs/', definition_vi: 'thơm ngon' },
    { id: 'd11', word: 'weather', phonetic: '/ˈweð.ər/', definition_vi: 'thời tiết' },
    { id: 'd12', word: 'sunshine', phonetic: '/ˈsʌn.ʃaɪn/', definition_vi: 'ánh nắng' },
    { id: 'd13', word: 'beautiful', phonetic: '/ˈbjuː.tɪ.fəl/', definition_vi: 'xinh đẹp' },
    { id: 'd14', word: 'weekend', phonetic: '/ˌwiːkˈend/', definition_vi: 'cuối tuần' },
    { id: 'd15', word: 'listen', phonetic: '/ˈlɪs.ən/', definition_vi: 'lắng nghe' },
    { id: 'd16', word: 'helpful', phonetic: '/ˈhelp.fəl/', definition_vi: 'hữu ích, chu đáo' },
    { id: 'd17', word: 'together', phonetic: '/təˈɡeð.ər/', definition_vi: 'cùng nhau' },
    { id: 'd18', word: 'journey', phonetic: '/ˈdʒɜː.ni/', definition_vi: 'hành trình' },
    { id: 'd19', word: 'laugh', phonetic: '/lɑːf/', definition_vi: 'tiếng cười' },
    { id: 'd20', word: 'promise', phonetic: '/ˈprɒm.ɪs/', definition_vi: 'lời hứa' },
    { id: 'd21', word: 'support', phonetic: '/səˈpɔːt/', definition_vi: 'ủng hộ, giúp đỡ' },
    { id: 'd22', word: 'comfort', phonetic: '/ˈkʌm.fət/', definition_vi: 'sự an ủi, tiện nghi' },
    { id: 'd23', word: 'favorite', phonetic: '/ˈfeɪ.vər.ɪt/', definition_vi: 'yêu thích nhất' },
    { id: 'd24', word: 'peaceful', phonetic: '/ˈpiːs.fəl/', definition_vi: 'thanh bình' },
    { id: 'd25', word: 'grateful', phonetic: '/ˈɡreɪt.fəl/', definition_vi: 'biết ơn' }
  ]
};

// Top 5 chuẩn bộ từ vựng then chốt phục vụ đúng mục tiêu luyện thi TOEIC & Giao tiếp
export const DEFAULT_VOCAB_TOPICS: VocabTopic[] = [
  TOEIC_600_MASTER_PACK,
  bizOfficePack,
  hrRecruitmentPack,
  financeBankingPack,
  travelTransportPack,
  dailyLifePack
];

export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Dễ (Thực tập sinh)',
    maxLives: 5,
    baseSpeed: 0.85,
    spawnInterval: 3200,
    maxActiveWords: 3,
    specialChance: 0.18,
    scoreMultiplier: 1.0,
  },
  medium: {
    label: 'Trung bình (Phi công tinh nhuệ)',
    maxLives: 4,
    baseSpeed: 1.45,
    spawnInterval: 2400,
    maxActiveWords: 5,
    specialChance: 0.15,
    scoreMultiplier: 1.5,
  },
  hard: {
    label: 'Khó (Chiến binh Ace)',
    maxLives: 3,
    baseSpeed: 2.1,
    spawnInterval: 1750,
    maxActiveWords: 6,
    specialChance: 0.12,
    scoreMultiplier: 2.2,
  },
};

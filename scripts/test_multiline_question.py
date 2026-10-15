import unittest
from test_converter import convert_block_to_question, parse_docx_file

class MultilineQuestionTest(unittest.TestCase):
    def test_bai4_quote_survives_extraction(self):
        blocks = parse_docx_file('CHỦ NGHĨA XÃ HỘI KHOA HỌC - BÀI 4.docx', 'bai-4')
        block = next(b for b in blocks if b[0][1].startswith('Câu 7 '))
        question = convert_block_to_question(block, 'bai-4', 7)
        self.assertIn('Trước sự liên minh của các đại biểu khoa học', question['content'])
        self.assertIn('giới kỹ thuật không một thế lực đen tối nào đứng vững được', question['content'])
        self.assertEqual(question['correctAnswers'], ['B'])

if __name__ == '__main__':
    unittest.main()

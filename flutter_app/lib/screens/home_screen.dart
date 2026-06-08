import 'package:flutter/material.dart';
import 'survey_screen.dart';
import 'voice_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  // 아이콘 애니메이션
  late final AnimationController _iconCtrl = AnimationController(
    vsync: this, duration: const Duration(milliseconds: 600));
  late final Animation<double> _iconOpacity =
      Tween(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(parent: _iconCtrl, curve: Curves.easeIn));

  // 텍스트 페이드인 애니메이션
  late final AnimationController _textCtrl = AnimationController(
    vsync: this, duration: const Duration(milliseconds: 700));
  late final Animation<double> _textOpacity =
      Tween(begin: 0.0, end: 1.0).animate(
          CurvedAnimation(parent: _textCtrl, curve: Curves.easeIn));

  bool _showIcon = true; // true=아이콘, false=문구+버튼

  @override
  void initState() {
    super.initState();
    _runIntro();
  }

  Future<void> _runIntro() async {
    // 아이콘 페이드인
    await _iconCtrl.forward();
    // 2.5초 유지
    await Future.delayed(const Duration(milliseconds: 2500));
    // 아이콘 페이드아웃
    await _iconCtrl.reverse();
    // 문구+버튼으로 전환
    if (mounted) setState(() => _showIcon = false);
    await _textCtrl.forward();
  }

  @override
  void dispose() {
    _iconCtrl.dispose();
    _textCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8F0),
      body: SafeArea(
        child: _showIcon ? _buildIconPhase() : _buildMainPhase(),
      ),
    );
  }

  // ── 1단계: 아이콘 ──────────────────────────────────────
  Widget _buildIconPhase() {
    return Center(
      child: FadeTransition(
        opacity: _iconOpacity,
        child: _AppIcon(size: 200),
      ),
    );
  }

  // ── 2단계: 문구 + 버튼 ─────────────────────────────────
  Widget _buildMainPhase() {
    return FadeTransition(
      opacity: _textOpacity,
      child: Column(
        children: [
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Text(
                    '일자리 구하세요?',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'JalnanGothic',
                      fontSize: 38,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5C3D2E),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
            child: Column(
              children: [
                // 설문으로 시작
                SizedBox(
                  width: double.infinity,
                  height: 68,
                  child: ElevatedButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SurveyScreen()),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4A574),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18)),
                      elevation: 0,
                    ),
                    child: const Text(
                      '📋  설문으로 시작',
                      style: TextStyle(
                          fontFamily: 'JalnanGothic',
                          fontSize: 22,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // 음성으로 시작
                SizedBox(
                  width: double.infinity,
                  height: 68,
                  child: ElevatedButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const VoiceScreen()),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF5E6D3),
                      foregroundColor: const Color(0xFF5C3D2E),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18)),
                      elevation: 0,
                    ),
                    child: const Text(
                      '🎤  음성으로 시작',
                      style: TextStyle(
                          fontFamily: 'JalnanGothic',
                          fontSize: 22,
                          fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── 앱 아이콘 위젯 ──────────────────────────────────────────
class _AppIcon extends StatelessWidget {
  final double size;
  const _AppIcon({required this.size});

  @override
  Widget build(BuildContext context) {
    final double bigSize = size * 0.22;
    final double smallSize = size * 0.13;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFD4A574),
        borderRadius: BorderRadius.circular(size * 0.22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFD4A574).withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 행 1: "구" — 행 첫 글자 강조
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _glyph('구', bigSize, accent: true),
            ],
          ),
          SizedBox(height: size * 0.02),
          // 행 2: "해요" — '해' 강조, '요' 보통
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _glyph('해', bigSize, accent: true),
              SizedBox(width: size * 0.02),
              _glyph('요', smallSize, accent: false),
            ],
          ),
          SizedBox(height: size * 0.02),
          // 행 3: "요기서" — '요' 강조, '기서' 작게
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _glyph('요', bigSize, accent: true),
              SizedBox(width: size * 0.015),
              _glyph('기', smallSize, accent: false),
              SizedBox(width: size * 0.015),
              _glyph('서', smallSize, accent: false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _glyph(String ch, double fontSize, {required bool accent}) {
    return Text(
      ch,
      style: TextStyle(
        fontFamily: 'JalnanGothic',
        fontSize: fontSize,
        fontWeight: accent ? FontWeight.bold : FontWeight.w400,
        color: accent ? Colors.white : Colors.white.withValues(alpha: 0.65),
        height: 1.0,
      ),
    );
  }
}

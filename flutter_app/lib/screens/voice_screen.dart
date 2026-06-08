import 'package:flutter/material.dart';

class VoiceScreen extends StatefulWidget {
  const VoiceScreen({super.key});
  @override
  State<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends State<VoiceScreen>
    with SingleTickerProviderStateMixin {
  bool _isListening = false;

  // 버튼 눌렀을 때 파동 애니메이션
  late final AnimationController _pulseCtrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );
  late final Animation<double> _pulseAnim =
      Tween(begin: 1.0, end: 1.18).animate(
          CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));

  void _toggleListening() {
    setState(() => _isListening = !_isListening);
    if (_isListening) {
      _pulseCtrl.repeat(reverse: true);
    } else {
      _pulseCtrl.stop();
      _pulseCtrl.reset();
    }
    // TODO: 실제 음성 인식 로직 연결 예정
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8F0),
      body: SafeArea(
        child: Column(
          children: [
            // 헤더
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(children: [
                InkWell(
                  onTap: () => Navigator.pop(context),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5E6D3),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Center(
                      child: Text('←',
                          style: TextStyle(
                              fontFamily: 'JalnanGothic',
                              fontSize: 24,
                              color: Color(0xFF5C3D2E))),
                    ),
                  ),
                ),
              ]),
            ),

            // 중앙 영역
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // 파동 + 동그란 버튼
                  AnimatedBuilder(
                    animation: _pulseAnim,
                    builder: (_, child) => Transform.scale(
                      scale: _isListening ? _pulseAnim.value : 1.0,
                      child: child,
                    ),
                    child: GestureDetector(
                      onTap: _toggleListening,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: 160,
                        height: 160,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _isListening
                              ? const Color(0xFFD4A574)
                              : const Color(0xFFF5E6D3),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFD4A574)
                                  .withValues(alpha: _isListening ? 0.4 : 0.15),
                              blurRadius: _isListening ? 32 : 16,
                              spreadRadius: _isListening ? 8 : 0,
                            ),
                          ],
                        ),
                        child: Icon(
                          _isListening ? Icons.mic : Icons.mic_none_rounded,
                          size: 72,
                          color: _isListening
                              ? Colors.white
                              : const Color(0xFFD4A574),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // 안내 문구
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: Text(
                      _isListening ? '듣고 있어요...' : '원하는 직종을 말해주세요',
                      key: ValueKey(_isListening),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'JalnanGothic',
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: _isListening
                            ? const Color(0xFFD4A574)
                            : const Color(0xFF5C3D2E),
                        height: 1.4,
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  Text(
                    _isListening ? '버튼을 다시 누르면 멈춰요' : '버튼을 누르고 말씀해주세요',
                    style: const TextStyle(
                      fontFamily: 'JalnanGothic',
                      fontSize: 15,
                      color: Color(0xFF8B6F47),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

#!/usr/bin/env bash

#
# Pi Extensions Installer
# Installs Pi extensions to ~/.pi/agent/extensions/
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PI_EXTENSIONS_DIR="$HOME/.pi/agent/extensions"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSIONS_SOURCE_DIR="$SCRIPT_DIR/extensions"

# Available extensions
AVAILABLE_EXTENSIONS=(
  "context-workflow"
  "funny-status"
)

# Functions
print_header() {
  echo -e "${BLUE}"
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║           Pi Extensions Installer                            ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

check_prerequisites() {
  # Check if Pi is installed
  if ! command -v pi &> /dev/null; then
    print_warning "Pi coding agent not found in PATH"
    print_info "Install Pi first: npm install -g @mariozechner/pi-coding-agent"
    print_info "Continuing anyway - extensions will be ready when you install Pi"
  else
    print_success "Pi coding agent found: $(pi --version)"
  fi

  # Check if extensions directory exists
  if [ ! -d "$HOME/.pi/agent" ]; then
    print_info "Creating Pi agent directory..."
    mkdir -p "$PI_EXTENSIONS_DIR"
    print_success "Created $PI_EXTENSIONS_DIR"
  elif [ ! -d "$PI_EXTENSIONS_DIR" ]; then
    print_info "Creating extensions directory..."
    mkdir -p "$PI_EXTENSIONS_DIR"
    print_success "Created $PI_EXTENSIONS_DIR"
  else
    print_success "Extensions directory exists"
  fi
}

list_available_extensions() {
  echo ""
  echo -e "${BLUE}Available extensions:${NC}"
  echo ""
  for ext in "${AVAILABLE_EXTENSIONS[@]}"; do
    local desc=""
    case $ext in
      "context-workflow")
        desc="Context-isolated workflow (clean review, deterministic)"
        ;;
      "funny-status")
        desc="Fun status messages while Pi works"
        ;;
    esac
    echo -e "  ${GREEN}$ext${NC} - $desc"
  done
  echo ""
}

backup_existing_extension() {
  local ext_name=$1
  local target_file="$PI_EXTENSIONS_DIR/${ext_name}.ts"
  
  if [ -f "$target_file" ]; then
    local backup_file="$target_file.backup.$(date +%Y%m%d_%H%M%S)"
    print_warning "Existing extension found, backing up to $(basename "$backup_file")"
    cp "$target_file" "$backup_file"
    print_success "Backup created"
  fi
}

install_extension() {
  local ext_name=$1
  local source_file="$EXTENSIONS_SOURCE_DIR/$ext_name/${ext_name}.ts"
  local target_file="$PI_EXTENSIONS_DIR/${ext_name}.ts"

  # Check if source exists
  if [ ! -f "$source_file" ]; then
    print_error "Extension source not found: $source_file"
    return 1
  fi

  # Backup existing if present
  backup_existing_extension "$ext_name"

  # Copy extension
  print_info "Installing $ext_name..."
  cp "$source_file" "$target_file"
  
  if [ $? -eq 0 ]; then
    print_success "Installed $ext_name to $target_file"
    return 0
  else
    print_error "Failed to install $ext_name"
    return 1
  fi
}

install_all_extensions() {
  local success_count=0
  local fail_count=0

  echo ""
  print_info "Installing all extensions..."
  echo ""

  for ext in "${AVAILABLE_EXTENSIONS[@]}"; do
    if install_extension "$ext"; then
      ((success_count++))
    else
      ((fail_count++))
    fi
    echo ""
  done

  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  print_success "Installed: $success_count extension(s)"
  if [ $fail_count -gt 0 ]; then
    print_error "Failed: $fail_count extension(s)"
  fi
  echo "═══════════════════════════════════════════════════════════════"
}

show_usage() {
  echo "Usage: $0 [extension-name...]"
  echo ""
  echo "Install Pi extensions to ~/.pi/agent/extensions/"
  echo ""
  echo "Options:"
  echo "  (no args)           Install all extensions"
  echo "  extension-name      Install specific extension(s)"
  echo "  -h, --help          Show this help message"
  echo "  -l, --list          List available extensions"
  echo ""
  echo "Examples:"
  echo "  $0                          # Install all"
  echo "  $0 auto-workflow            # Install one"
  echo "  $0 auto-workflow funny-status   # Install multiple"
  echo ""
  list_available_extensions
}

post_install_instructions() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                Installation Complete! 🎉                     ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo ""
  echo "1. Start or restart Pi:"
  echo "   ${GREEN}pi${NC}"
  echo ""
  echo "2. In Pi, reload extensions:"
  echo "   ${GREEN}/reload${NC}"
  echo ""
  echo "3. Try an extension:"
  
  # Show commands for installed extensions
  if [ -f "$PI_EXTENSIONS_DIR/auto-workflow.ts" ]; then
    echo "   ${GREEN}/auto spec.md${NC}         (Autonomous workflow)"
  fi
  if [ -f "$PI_EXTENSIONS_DIR/workflow-engine.ts" ]; then
    echo "   ${GREEN}/workflow:start \"feature\"${NC}  (Manual workflow)"
  fi
  if [ -f "$PI_EXTENSIONS_DIR/plan-workflow.ts" ]; then
    echo "   ${GREEN}/plan \"project\"${NC}      (Plan-based workflow)"
  fi
  if [ -f "$PI_EXTENSIONS_DIR/funny-status.ts" ]; then
    echo "   ${GREEN}(funny-status works automatically!)${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}Documentation:${NC}"
  echo "   ${GREEN}$SCRIPT_DIR/README.md${NC}"
  echo ""
  echo -e "${BLUE}Extension docs:${NC}"
  for ext in "${AVAILABLE_EXTENSIONS[@]}"; do
    if [ -f "$PI_EXTENSIONS_DIR/${ext}.ts" ]; then
      echo "   ${GREEN}$SCRIPT_DIR/extensions/$ext/README.md${NC}"
    fi
  done
  echo ""
}

# Main
main() {
  print_header

  # Handle help flag
  if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
  fi

  # Handle list flag
  if [ "$1" = "-l" ] || [ "$1" = "--list" ]; then
    list_available_extensions
    exit 0
  fi

  # Check prerequisites
  check_prerequisites
  echo ""

  # If no arguments, install all
  if [ $# -eq 0 ]; then
    install_all_extensions
  else
    # Install specific extensions
    local success_count=0
    local fail_count=0

    for ext_name in "$@"; do
      # Check if extension is available
      if [[ ! " ${AVAILABLE_EXTENSIONS[@]} " =~ " ${ext_name} " ]]; then
        print_error "Unknown extension: $ext_name"
        echo ""
        list_available_extensions
        ((fail_count++))
        continue
      fi

      if install_extension "$ext_name"; then
        ((success_count++))
      else
        ((fail_count++))
      fi
      echo ""
    done

    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    print_success "Installed: $success_count extension(s)"
    if [ $fail_count -gt 0 ]; then
      print_error "Failed: $fail_count extension(s)"
    fi
    echo "═══════════════════════════════════════════════════════════════"
  fi

  post_install_instructions
}

main "$@"

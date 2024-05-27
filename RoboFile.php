<?php
/**
 * This is project's console commands configuration for Robo task runner.
 *
 * @see https://robo.li/
 */
class RoboFile extends \Robo\Tasks
{
    // define public methods as commands
    public function buildPlugin()
    {
        $this->_exec('cd editor && npm run build');
        // 将 editor/dist 复制到 dirname(__FILE__) . '../fangtang7ban/wordpress/wp-content/plugins/plugin-editor-by-bud-coder/'
        $dist_dir = dirname(__FILE__) . '/../fangtang7ban/wordpress/wp-content/plugins/plugin-editor-by-bud-coder';
        // 删除 $dist_dir/dist
        $this->_exec('rm -rf '. $dist_dir . '/dist');
        $this->_exec('cp -r editor/dist '. $dist_dir);
        // 删除 $dist_dir/dist/absolute-reviews.zip
        $this->_exec('rm -rf '. $dist_dir . '/dist/absolute-reviews.zip');
    }
}

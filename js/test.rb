

def g
  begin
    yield 3
  ensure
    puts "In ensure"
  end
end

def f
  g do |x|
    puts "x = #{x}"
    break
  end
end

f
